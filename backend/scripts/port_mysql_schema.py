import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "schema_35_tables.sql"
PRISMA_PATH = ROOT / "backend" / "prisma" / "schema.prisma"
MIGRATION_PATH = (
    ROOT
    / "backend"
    / "prisma"
    / "migrations"
    / "20261102000000_initial"
    / "migration.sql"
)

TABLE_PATTERN = re.compile(
    r"CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\((.*?)\)\s*ENGINE=InnoDB;",
    re.IGNORECASE | re.DOTALL,
)
UNSIGNED_MAX = {
    "BIGINT": "18446744073709551615",
    "INT": "4294967295",
    "INTEGER": "4294967295",
    "SMALLINT": "65535",
    "TINYINT": "255",
}


def split_top_level(value: str) -> list[str]:
    parts: list[str] = []
    start = 0
    depth = 0
    quote: str | None = None

    for index, character in enumerate(value):
        if quote:
            if character == quote and (index == 0 or value[index - 1] != "\\"):
                quote = None
        elif character in "'\"`":
            quote = character
        elif character == "(":
            depth += 1
        elif character == ")":
            depth -= 1
        elif character == "," and depth == 0:
            parts.append(value[start:index].strip())
            start = index + 1

    parts.append(value[start:].strip())
    return parts


def pascal_case(value: str) -> str:
    return "".join(part[:1].upper() + part[1:] for part in value.split("_"))


def parse_column(segment: str) -> dict[str, str | bool | None]:
    match = re.match(r"\s*(\w+)\s+([A-Z]+(?:\s*\([^)]*\))?(?:\s+UNSIGNED)?)\s*(.*)", segment, re.I | re.S)
    if not match:
        raise ValueError(f"Unable to parse column definition: {segment}")

    name, mysql_type, remainder = match.groups()
    default_match = re.search(
        r"\bDEFAULT\s+(CURRENT_TIMESTAMP|'(?:[^']|'')*'|-?\d+(?:\.\d+)?)",
        remainder,
        re.I,
    )
    default = default_match.group(1) if default_match else None
    return {
        "name": name,
        "mysql_type": " ".join(mysql_type.upper().split()),
        "nullable": not bool(re.search(r"\bNOT NULL\b", remainder, re.I)),
        "auto_increment": bool(re.search(r"\bAUTO_INCREMENT\b", remainder, re.I)),
        "on_update": bool(re.search(r"\bON UPDATE CURRENT_TIMESTAMP\b", remainder, re.I)),
        "default": default,
    }


def parse_constraint(segment: str) -> dict[str, object] | None:
    segment = " ".join(segment.split())
    primary = re.match(r"PRIMARY KEY\s*\((.*?)\)", segment, re.I)
    if primary:
        return {"kind": "primary", "columns": split_top_level(primary.group(1))}

    unique = re.match(r"UNIQUE KEY\s+(\w+)\s*\((.*?)\)", segment, re.I)
    if unique:
        return {
            "kind": "unique",
            "name": unique.group(1),
            "columns": split_top_level(unique.group(2)),
        }

    index = re.match(r"KEY\s+(\w+)\s*\((.*?)\)", segment, re.I)
    if index:
        return {
            "kind": "index",
            "name": index.group(1),
            "columns": split_top_level(index.group(2)),
        }

    foreign_key = re.match(
        r"CONSTRAINT\s+(\w+)\s+FOREIGN KEY\s*\((.*?)\)\s+REFERENCES\s+"
        r"(\w+)\s*\((.*?)\)(?:\s+ON DELETE\s+(CASCADE|RESTRICT|SET NULL|NO ACTION))?",
        segment,
        re.I,
    )
    if foreign_key:
        name, columns, target, target_columns, on_delete = foreign_key.groups()
        return {
            "kind": "foreign",
            "name": name,
            "columns": split_top_level(columns),
            "target": target,
            "target_columns": split_top_level(target_columns),
            "on_delete": (on_delete or "NO ACTION").upper(),
        }

    check = re.match(r"CONSTRAINT\s+(\w+)\s+CHECK\s*\((.*)\)$", segment, re.I)
    if check:
        return {"kind": "check", "name": check.group(1), "expression": check.group(2)}

    if segment:
        raise ValueError(f"Unsupported table constraint: {segment}")
    return None


def parse_source(sql: str) -> list[dict[str, object]]:
    tables: list[dict[str, object]] = []
    for match in TABLE_PATTERN.finditer(sql):
        name, body = match.groups()
        columns: list[dict[str, str | bool | None]] = []
        constraints: list[dict[str, object]] = []
        for segment in split_top_level(body):
            if re.match(r"^(?:PRIMARY KEY|UNIQUE KEY|KEY|CONSTRAINT)\b", segment, re.I):
                constraint = parse_constraint(segment)
                if constraint:
                    constraints.append(constraint)
            else:
                columns.append(parse_column(segment))
        tables.append({"name": name, "columns": columns, "constraints": constraints})

    if len(tables) != 35:
        raise ValueError(f"Expected 35 source tables; found {len(tables)}.")
    return tables


def type_info(mysql_type: str) -> tuple[str, str, str | None]:
    unsigned = " UNSIGNED" in mysql_type
    base = mysql_type.replace(" UNSIGNED", "")
    if base.startswith("BIGINT"):
        return ("Decimal", "@db.Decimal(20, 0)", "BIGINT" if unsigned else None)
    if base.startswith(("INT", "INTEGER")):
        if unsigned:
            return ("Decimal", "@db.Decimal(10, 0)", "INT")
        return ("Int", "@db.Integer", None)
    if base.startswith("SMALLINT"):
        if unsigned:
            return ("Decimal", "@db.Decimal(5, 0)", "SMALLINT")
        return ("Int", "@db.SmallInt", None)
    if base.startswith("TINYINT(1)"):
        return ("Boolean", "@db.Boolean", None)
    if base.startswith("TINYINT") and unsigned:
        return ("Decimal", "@db.Decimal(3, 0)", "TINYINT")
    if base.startswith("TINYINT"):
        return ("Int", "@db.SmallInt", None)
    if base.startswith("DECIMAL"):
        precision, scale = re.search(r"\((\d+),\s*(\d+)\)", base).groups()
        return ("Decimal", f"@db.Decimal({precision}, {scale})", None)
    if base.startswith("VARCHAR"):
        length = re.search(r"\((\d+)\)", base).group(1)
        return ("String", f"@db.VarChar({length})", None)
    if base.startswith("CHAR"):
        length = re.search(r"\((\d+)\)", base).group(1)
        return ("String", f"@db.Char({length})", None)
    if base == "MEDIUMTEXT" or base == "TEXT":
        return ("String", "@db.Text", None)
    if base == "DATETIME":
        return ("DateTime", "@db.Timestamp(0)", None)
    if base == "JSON":
        return ("Json", "@db.JsonB", None)
    raise ValueError(f"Unsupported MySQL type: {mysql_type}")


def default_prisma(column: dict[str, object], table: str) -> str:
    if column["auto_increment"]:
        sequence = f"{table}_{column['name']}_seq"
        if str(column["mysql_type"]).startswith("BIGINT UNSIGNED"):
            return (
                f'@default(dbgenerated("next_unsigned_bigint('
                f"'{sequence}_low'::regclass, '{sequence}_high'::regclass)"
                f'"))'
            )
        return f'@default(dbgenerated("nextval(\'{sequence}\'::regclass)"))'
    if column["on_update"]:
        return "@default(now()) @updatedAt"

    value = column["default"]
    if value is None:
        return ""
    if value == "CURRENT_TIMESTAMP":
        return "@default(now())"
    mysql_type = str(column["mysql_type"])
    if mysql_type.startswith("TINYINT(1)"):
        return "@default(true)" if value == "1" else "@default(false)"
    if value.startswith("'"):
        string_value = value[1:-1].replace("''", "'")
        return f"@default({json.dumps(string_value)})"
    if "," in value:
        raise ValueError(f"Unsupported default value: {value}")
    return f"@default({value})"


def prisma_constraint_attribute(constraint: dict[str, object]) -> str | None:
    kind = constraint["kind"]
    columns = constraint["columns"]
    if kind == "primary":
        if len(columns) == 1:
            return None
        return f"  @@id([{', '.join(columns)}])"
    if kind == "unique":
        name = constraint["name"]
        if len(columns) == 1:
            return None
        return f'  @@unique([{", ".join(columns)}], map: "{name}")'
    if kind == "index":
        name = constraint["name"]
        return f'  @@index([{", ".join(columns)}], map: "{name}")'
    return None


def build_prisma(tables: list[dict[str, object]]) -> str:
    table_by_name = {table["name"]: table for table in tables}
    lines = [
        "generator client {",
        '  provider = "prisma-client-js"',
        "}",
        "",
        "datasource db {",
        '  provider = "postgresql"',
        "}",
        "",
    ]

    for table in tables:
        table_name = str(table["name"])
        model_name = pascal_case(table_name)
        columns = table["columns"]
        constraints = table["constraints"]
        primary = next(item for item in constraints if item["kind"] == "primary")
        unique_by_column = {
            item["columns"][0]: item["name"]
            for item in constraints
            if item["kind"] == "unique" and len(item["columns"]) == 1
        }
        lines.append(f"model {model_name} {{")

        for column in columns:
            name = str(column["name"])
            scalar_type, native_type, _ = type_info(str(column["mysql_type"]))
            optional = "?" if column["nullable"] else ""
            attributes = [native_type]
            if primary["columns"] == [name]:
                attributes.insert(0, "@id")
                if len(primary["columns"]) == 1 and column["auto_increment"]:
                    attributes.insert(1, default_prisma(column, table_name))
            else:
                default = default_prisma(column, table_name)
                if default:
                    attributes.insert(0, default)
                if name in unique_by_column:
                    attributes.insert(0, f'@unique(map: "{unique_by_column[name]}")')
            lines.append(f"  {name} {scalar_type}{optional} {' '.join(attributes)}")

        for constraint in constraints:
            if constraint["kind"] != "foreign":
                continue
            local = constraint["columns"]
            target = str(constraint["target"])
            target_model = pascal_case(target)
            relation_name = str(constraint["name"])
            relation_field = f"{relation_name}_ref"
            optional = "?" if any(
                column["name"] == local[0] and column["nullable"]
                for column in columns
            ) else ""
            on_delete = {
                "CASCADE": "Cascade",
                "RESTRICT": "Restrict",
                "SET NULL": "SetNull",
                "NO ACTION": "NoAction",
            }[str(constraint["on_delete"])]
            lines.append(
                f'  {relation_field} {target_model}{optional} @relation("{relation_name}", '
                f'fields: [{", ".join(local)}], references: [{", ".join(constraint["target_columns"])}], '
                f"onDelete: {on_delete})"
            )

        for source in tables:
            for constraint in source["constraints"]:
                if constraint["kind"] == "foreign" and constraint["target"] == table_name:
                    source_model = pascal_case(str(source["name"]))
                    lines.append(
                        f'  back_{constraint["name"]} {source_model}[] '
                        f'@relation("{constraint["name"]}")'
                    )

        for constraint in constraints:
            if constraint["kind"] in {"primary", "unique", "index"}:
                attribute = prisma_constraint_attribute(constraint)
                if attribute:
                    lines.append(attribute)
        lines.append(f'  @@map("{table_name}")')
        lines.append("}")
        lines.append("")

    return "\n".join(lines)


def pg_identifier(name: str) -> str:
    return f'"{name}"'


def unsigned_constraint_name(table: str, column: str) -> str:
    digest = hashlib.sha1(f"{table}.{column}".encode()).hexdigest()[:8]
    return f"ck_u_{table[:22]}_{column[:20]}_{digest}"


def pg_column_type(mysql_type: str) -> tuple[str, str | None]:
    scalar_type, native_type, unsigned = type_info(mysql_type)
    if unsigned:
        precision = {
            "BIGINT": 20,
            "INT": 10,
            "SMALLINT": 5,
            "TINYINT": 3,
        }[unsigned]
        return f"NUMERIC({precision}, 0)", unsigned

    native = native_type.removeprefix("@db.")
    if native.startswith("Decimal"):
        return f"NUMERIC{native[len('Decimal'):]}", None
    if native.startswith("VarChar"):
        return f"VARCHAR{native[len('VarChar'):]}", None
    if native.startswith("Char"):
        return f"CHAR{native[len('Char'):]}", None
    if native == "Text":
        return "TEXT", None
    if native == "Timestamp(0)":
        return "TIMESTAMP(0) WITHOUT TIME ZONE", None
    if native == "JsonB":
        return "JSONB", None
    if scalar_type == "Boolean":
        return "BOOLEAN", None
    if native == "Integer":
        return "INTEGER", None
    if native == "SmallInt":
        return "SMALLINT", None
    raise ValueError(f"Unsupported PostgreSQL mapping for {mysql_type}")


def pg_default(column: dict[str, object], table: str) -> str | None:
    if column["auto_increment"]:
        sequence = f"{table}_{column['name']}_seq"
        return (
            f"next_unsigned_bigint('{sequence}_low'::regclass, "
            f"'{sequence}_high'::regclass)"
        )
    value = column["default"]
    if value is None:
        return None
    if value == "CURRENT_TIMESTAMP":
        return "CURRENT_TIMESTAMP"
    mysql_type = str(column["mysql_type"])
    if mysql_type.startswith("TINYINT(1)"):
        return "TRUE" if value == "1" else "FALSE"
    if value.startswith("'"):
        return value.replace("''", "''")
    return value


def pg_check_expression(name: str, expression: str) -> str:
    if name == "chk_attribute_value_one_type":
        return (
            "num_nonnulls(value_text, value_decimal, value_integer, "
            "value_boolean, value_json) = 1"
        )
    if name == "chk_answer_one_value":
        return (
            "(selected_option_id IS NOT NULL AND answer_text IS NULL AND "
            "answer_number IS NULL AND answer_boolean IS NULL AND answer_json IS NULL) "
            "OR (selected_option_id IS NULL AND "
            "num_nonnulls(answer_text, answer_number, answer_boolean, answer_json) = 1)"
        )
    return re.sub(
        r"(value_boolean\s+IN)\s*\(0,\s*1\)",
        r"\1 (FALSE, TRUE)",
        expression,
        flags=re.I,
    )


def pg_constraint(constraint: dict[str, object]) -> str:
    kind = constraint["kind"]
    name = constraint.get("name")
    if kind == "primary":
        columns = ", ".join(pg_identifier(column) for column in constraint["columns"])
        return f"PRIMARY KEY ({columns})"
    if kind == "unique":
        columns = ", ".join(pg_identifier(column) for column in constraint["columns"])
        return f"CONSTRAINT {pg_identifier(str(name))} UNIQUE ({columns})"
    if kind == "foreign":
        columns = ", ".join(pg_identifier(column) for column in constraint["columns"])
        target_columns = ", ".join(
            pg_identifier(column) for column in constraint["target_columns"]
        )
        return (
            f"CONSTRAINT {pg_identifier(str(name))} FOREIGN KEY ({columns}) "
            f"REFERENCES {pg_identifier(str(constraint['target']))} ({target_columns}) "
            f"ON DELETE {constraint['on_delete']}"
        )
    if kind == "check":
        expression = pg_check_expression(str(name), str(constraint["expression"]))
        return f"CONSTRAINT {pg_identifier(str(name))} CHECK ({expression})"
    raise ValueError(f"Unsupported constraint kind: {kind}")


def build_migration(tables: list[dict[str, object]]) -> str:
    lines = [
        "-- Ported from schema_35_tables.sql (MySQL 8) without seed statements.",
        "-- ICU primary-strength collation approximates utf8mb4_0900_ai_ci.",
        "CREATE COLLATION mysql_0900_ai_ci (",
        "  provider = icu,",
        "  locale = 'und-u-ks-level1',",
        "  deterministic = false",
        ");",
        "",
    ]
    for table in tables:
        table_name = str(table["name"])
        for column in table["columns"]:
            if column["auto_increment"]:
                sequence = f"{table_name}_{column['name']}_seq"
                lines.extend(
                    [
                        f"CREATE SEQUENCE {pg_identifier(f'{sequence}_low')} "
                        "AS BIGINT START WITH 1 MINVALUE 1 "
                        "MAXVALUE 9223372036854775807 NO CYCLE;",
                        f"CREATE SEQUENCE {pg_identifier(f'{sequence}_high')} "
                        "AS BIGINT START WITH -9223372036854775808 "
                        "MINVALUE -9223372036854775808 MAXVALUE -1 NO CYCLE;",
                    ]
                )
        lines.append("")

    lines.extend(
        [
            "CREATE FUNCTION next_unsigned_bigint(low_sequence REGCLASS, high_sequence REGCLASS)",
            "RETURNS NUMERIC(20, 0)",
            "LANGUAGE plpgsql AS $$",
            "DECLARE",
            "  next_value BIGINT;",
            "BEGIN",
            "  BEGIN",
            "    next_value := nextval(low_sequence);",
            "    RETURN next_value::NUMERIC(20, 0);",
            "  EXCEPTION WHEN sequence_generator_limit_exceeded THEN",
            "    next_value := nextval(high_sequence);",
            "    RETURN next_value::NUMERIC(20, 0) + 18446744073709551616;",
            "  END;",
            "END;",
            "$$;",
            "",
        ]
    )

    for table in tables:
        table_name = str(table["name"])
        table_lines: list[str] = []
        for column in table["columns"]:
            name = str(column["name"])
            column_type, unsigned = pg_column_type(str(column["mysql_type"]))
            collation = (
                " COLLATE mysql_0900_ai_ci"
                if column_type.startswith(("VARCHAR", "CHAR", "TEXT"))
                else ""
            )
            parts = [f"  {pg_identifier(name)} {column_type}{collation}"]
            if not column["nullable"]:
                parts.append(" NOT NULL")
            default = pg_default(column, table_name)
            if default is not None:
                parts.append(f" DEFAULT {default}")
            table_lines.append("".join(parts))
            if unsigned:
                max_value = UNSIGNED_MAX[unsigned]
                check_name = unsigned_constraint_name(table_name, name)
                table_lines.append(
                    f"  CONSTRAINT {pg_identifier(check_name)} CHECK "
                    f"({pg_identifier(name)} >= 0 AND {pg_identifier(name)} <= {max_value})"
                )
        table_lines.extend(
            f"  {pg_constraint(constraint)}"
            for constraint in table["constraints"]
            if constraint["kind"] != "index"
        )
        lines.append(f"CREATE TABLE {pg_identifier(table_name)} (")
        lines.append(",\n".join(table_lines))
        lines.append(");")

        for constraint in table["constraints"]:
            if constraint["kind"] == "index":
                name = str(constraint["name"])
                columns = ", ".join(
                    pg_identifier(column) for column in constraint["columns"]
                )
                lines.append(
                    f"CREATE INDEX {pg_identifier(name)} ON "
                    f"{pg_identifier(table_name)} ({columns});"
                )
        for column in table["columns"]:
            if column["auto_increment"]:
                sequence = f"{table_name}_{column['name']}_seq"
                lines.append(
                    f"ALTER SEQUENCE {pg_identifier(f'{sequence}_low')} OWNED BY "
                    f"{pg_identifier(table_name)}.{pg_identifier(str(column['name']))};"
                )
                lines.append(
                    f"ALTER SEQUENCE {pg_identifier(f'{sequence}_high')} OWNED BY "
                    f"{pg_identifier(table_name)}.{pg_identifier(str(column['name']))};"
                )
        lines.append("")

    timestamp_tables = [
        str(table["name"])
        for table in tables
        if any(column["on_update"] for column in table["columns"])
    ]
    if timestamp_tables:
        lines.extend(
            [
                "CREATE FUNCTION set_updated_at() RETURNS trigger",
                "LANGUAGE plpgsql AS $$",
                "BEGIN",
                "  NEW.updated_at = CURRENT_TIMESTAMP;",
                "  RETURN NEW;",
                "END;",
                "$$;",
                "",
            ]
        )
        for table_name in timestamp_tables:
            lines.extend(
                [
                    f"CREATE TRIGGER {pg_identifier(f'tr_{table_name}_updated_at')}",
                    f"BEFORE UPDATE ON {pg_identifier(table_name)}",
                    "FOR EACH ROW EXECUTE FUNCTION set_updated_at();",
                ]
            )
    return "\n".join(lines) + "\n"


def main() -> None:
    tables = parse_source(SOURCE.read_text(encoding="utf-8"))
    PRISMA_PATH.parent.mkdir(parents=True, exist_ok=True)
    MIGRATION_PATH.parent.mkdir(parents=True, exist_ok=True)
    PRISMA_PATH.write_text(build_prisma(tables), encoding="utf-8")
    MIGRATION_PATH.write_text(build_migration(tables), encoding="utf-8")
    print(
        f"Generated Prisma schema and PostgreSQL migration for "
        f"{len(tables)} tables from {SOURCE.name}."
    )


if __name__ == "__main__":
    main()
