package com.pc_builder_store.catalog.service;

import com.pc_builder_store.catalog.CatalogSpecificationValidator;
import com.pc_builder_store.catalog.dto.CatalogFacets;
import com.pc_builder_store.catalog.dto.CatalogAttributeDefinition;
import com.pc_builder_store.catalog.dto.CatalogProduct;
import com.pc_builder_store.catalog.dto.CatalogProductPage;
import com.pc_builder_store.catalog.dto.CatalogQuery;
import com.pc_builder_store.catalog.dto.CatalogQuery.AttributeFilter;
import com.pc_builder_store.catalog.dto.CatalogQuery.Direction;
import com.pc_builder_store.catalog.dto.CatalogQuery.Sort;
import com.pc_builder_store.catalog.exception.CatalogProductNotFoundException;
import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import com.pc_builder_store.catalog.repository.CatalogRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

@Service
public class CatalogService {

    private static final Pattern IDENTIFIER_FILTER = Pattern.compile("[\\p{L}\\p{N}_ -]{1,120}");
    private static final Pattern ATTRIBUTE_CODE = Pattern.compile("[a-z][a-z0-9_]{0,99}");
    private static final Pattern NON_NEGATIVE_INTEGER = Pattern.compile("\\d+");
    private static final Pattern PRICE = Pattern.compile("\\d+(?:\\.\\d{1,2})?");
    private static final Set<String> ALLOWED_PARAMETERS = Set.of(
            "page", "limit", "q", "type", "category", "brand", "minPrice", "maxPrice",
            "sort", "order", "attribute");
    private static final BigDecimal MAX_DATABASE_PRICE =
            new BigDecimal("9999999999999.99");
    private static final String DEMO_NOTICE =
            "Giá và tồn kho của các offer mã DEMO- là dữ liệu minh họa, không phải thông tin bán hàng trực tiếp.";

    private final CatalogRepository catalogRepository;

    public CatalogService(CatalogRepository catalogRepository) {
        this.catalogRepository = catalogRepository;
    }

    public CatalogFacets getFacets() {
        return catalogRepository.getFacets();
    }

    public List<CatalogAttributeDefinition> getAttributeDefinitions() {
        return catalogRepository.getAttributeDefinitions();
    }

    public CatalogProductPage getProducts(Map<String, String[]> parameters) {
        CatalogQuery query = parseQuery(parameters);
        CatalogRepository.ProductPage page = catalogRepository.findProducts(query);
        long totalPages = page.total() == 0
                ? 0
                : (page.total() + query.limit() - 1) / query.limit();
        return new CatalogProductPage(
                page.products(),
                new com.pc_builder_store.catalog.dto.CatalogPagination(
                        query.page(), query.limit(), page.total(), totalPages),
                DEMO_NOTICE);
    }

    public CatalogProduct getProduct(String modelCode) {
        if (modelCode == null || modelCode.isEmpty() || modelCode.length() > 100
                || modelCode.chars().anyMatch(character -> character <= 0x1f || character == 0x7f)) {
            throw invalid("Product model code is invalid.");
        }
        return catalogRepository.findActiveProduct(modelCode)
                .orElseThrow(CatalogProductNotFoundException::new);
    }

    @Transactional
    public CatalogProduct updateGpuSpecifications(
            String modelCode,
            Map<String, JsonNode> specifications) {
        if (modelCode == null || modelCode.isEmpty() || modelCode.length() > 100
                || modelCode.chars().anyMatch(character -> character <= 0x1f || character == 0x7f)) {
            throw invalid("Product model code is invalid.");
        }
        CatalogSpecificationValidator.validateGpuValues(specifications);
        catalogRepository.updateGpuSpecifications(modelCode, specifications);
        return getProduct(modelCode);
    }

    public String demoNotice() {
        return DEMO_NOTICE;
    }

    CatalogQuery parseQuery(Map<String, String[]> parameters) {
        for (String key : parameters.keySet()) {
            if (!ALLOWED_PARAMETERS.contains(key)) {
                throw invalid("Unsupported query parameter \"" + key + "\".");
            }
        }

        int page = parseInteger(singleValue(parameters, "page"), "page", 1, 1, 100000);
        int limit = parseInteger(singleValue(parameters, "limit"), "limit", 20, 1, 100);
        String query = singleValue(parameters, "q");
        if (query != null) {
            query = query.trim();
            if (query.length() > 200) {
                throw invalid("Query parameter \"q\" cannot exceed 200 characters.");
            }
            if (query.isEmpty()) {
                query = null;
            }
        }

        String type = singleValue(parameters, "type");
        String category = singleValue(parameters, "category");
        String brand = singleValue(parameters, "brand");
        validateIdentifierParameter("type", type);
        validateIdentifierParameter("category", category);
        validateIdentifierParameter("brand", brand);

        BigDecimal minPrice = parsePrice(singleValue(parameters, "minPrice"), "minPrice");
        BigDecimal maxPrice = parsePrice(singleValue(parameters, "maxPrice"), "maxPrice");
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw invalid("\"minPrice\" cannot exceed \"maxPrice\".");
        }

        String sortValue = singleValue(parameters, "sort");
        Sort sort = switch (sortValue == null ? "name" : sortValue) {
            case "name" -> Sort.NAME;
            case "price" -> Sort.PRICE;
            default -> throw invalid("Query parameter \"sort\" must be \"name\" or \"price\".");
        };
        String orderValue = singleValue(parameters, "order");
        Direction order = switch (orderValue == null ? "asc" : orderValue) {
            case "asc" -> Direction.ASC;
            case "desc" -> Direction.DESC;
            default -> throw invalid("Query parameter \"order\" must be \"asc\" or \"desc\".");
        };

        List<AttributeFilter> attributes = parseAttributes(parameters.get("attribute"));
        return new CatalogQuery(
                page, limit, query, type, category, brand, minPrice, maxPrice, sort, order, attributes);
    }

    private List<AttributeFilter> parseAttributes(String[] values) {
        if (values == null) {
            return List.of();
        }
        List<AttributeFilter> attributes = new ArrayList<>();
        Set<String> codes = new HashSet<>();
        for (String filter : values) {
            int separator = filter.indexOf('=');
            if (separator <= 0 || separator == filter.length() - 1) {
                throw invalid("Each \"attribute\" filter must use the form \"attribute=code=value\".");
            }
            String code = filter.substring(0, separator);
            String value = filter.substring(separator + 1);
            if (!ATTRIBUTE_CODE.matcher(code).matches() || value.length() > 200) {
                throw invalid("An attribute filter contains an invalid code or value.");
            }
            if (!codes.add(code)) {
                throw invalid("An \"attribute\" code may only be specified once.");
            }
            attributes.add(new AttributeFilter(code, value));
        }
        return List.copyOf(attributes);
    }

    private int parseInteger(
            String value, String name, int fallback, int minimum, int maximum) {
        if (value == null) {
            return fallback;
        }
        if (!NON_NEGATIVE_INTEGER.matcher(value).matches()) {
            throw invalid("Query parameter \"" + name + "\" must be an integer.");
        }
        try {
            int parsed = Integer.parseInt(value);
            if (parsed < minimum || parsed > maximum) {
                throw invalid("Query parameter \"" + name + "\" must be between "
                        + minimum + " and " + maximum + ".");
            }
            return parsed;
        } catch (NumberFormatException exception) {
            throw invalid("Query parameter \"" + name + "\" must be between "
                    + minimum + " and " + maximum + ".");
        }
    }

    private BigDecimal parsePrice(String value, String name) {
        if (value == null) {
            return null;
        }
        if (!PRICE.matcher(value).matches()) {
            throw invalid("Query parameter \"" + name
                    + "\" must be a non-negative amount with at most 2 decimal places.");
        }
        BigDecimal price = new BigDecimal(value);
        if (price.compareTo(MAX_DATABASE_PRICE) > 0) {
            throw invalid("Price filters exceed the supported database range.");
        }
        return price;
    }

    private void validateIdentifierParameter(String name, String value) {
        if (value != null && !IDENTIFIER_FILTER.matcher(value).matches()) {
            throw invalid("Query parameter \"" + name + "\" contains invalid characters.");
        }
    }

    private String singleValue(Map<String, String[]> parameters, String name) {
        String[] values = parameters.get(name);
        if (values == null || values.length == 0) {
            return null;
        }
        if (values.length > 1) {
            throw invalid("Query parameter \"" + name + "\" must be specified once.");
        }
        return values[0];
    }

    private InvalidCatalogQueryException invalid(String message) {
        return new InvalidCatalogQueryException(message);
    }
}
