import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AdminLayout,
  Badge,
  Card,
  CustomerLayout,
  DataTable,
  Drawer,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  Modal,
  Pagination,
  PrimaryButton,
  SearchInput,
  SecondaryButton,
} from "./components";

interface PreviewRow {
  label: string;
  code: string;
  state: string;
}

const previewRows: PreviewRow[] = [
  { label: "Product card", code: "MODEL-CODE-PREVIEW", state: "Preview only" },
];

export default function V2FoundationPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <CustomerLayout>
      <div className="v2-preview-stack">
        <div>
          <Badge tone="gold">Shared design foundation</Badge>
          <h1>V2 components preview</h1>
          <p>Visual component preview only. No product, customer, order, or sales data is connected here.</p>
          <Link className="v2-header-link" to="/system/v2-admin-preview">Open admin shell preview</Link>
        </div>

        <Card title="Buttons and badges" description="Reusable actions and status labels.">
          <div className="v2-preview-row">
            <PrimaryButton type="button">Primary action</PrimaryButton>
            <SecondaryButton type="button">Secondary action</SecondaryButton>
            <Badge tone="primary">Primary</Badge>
            <Badge tone="gold">Demo / preview</Badge>
            <Badge tone="success">Success state</Badge>
            <Badge tone="warning">Warning state</Badge>
            <Badge tone="error">Error state</Badge>
          </div>
        </Card>

        <Card title="Forms" description="Labels, helper text, and search input.">
          <div className="v2-preview-grid">
            <FormField label="Example field" htmlFor="v2-preview-field" hint="Preview content only; nothing is submitted.">
              <input className="v2-form-input" id="v2-preview-field" placeholder="Enter a value" />
            </FormField>
            <FormField label="Search" htmlFor="v2-preview-search">
              <SearchInput id="v2-preview-search" aria-label="Preview search" placeholder="Search components" />
            </FormField>
          </div>
        </Card>

        <Card title="Data table" description="Scrollable table with SKU/model-code typography.">
          <DataTable
            columns={[
              { key: "label", header: "Component", render: (row) => row.label },
              { key: "code", header: "Identifier", render: (row) => <span className="v2-table-code">{row.code}</span> },
              { key: "state", header: "State", render: (row) => <Badge>{row.state}</Badge> },
            ]}
            rows={previewRows}
            getRowKey={(row) => row.code}
          />
          <div style={{ marginTop: 16 }}>
            <Pagination page={1} totalPages={3} onPageChange={() => undefined} />
          </div>
        </Card>

        <div className="v2-preview-grid">
          <EmptyState title="Empty state" message="A neutral placeholder when no records are available." />
          <LoadingState message="Loading state preview." />
          <ErrorState title="Error state" message="A clear, non-success fallback for failed requests." />
        </div>

        <Card title="Overlays" description="Accessible native dialog-based modal and drawer.">
          <div className="v2-preview-row">
            <PrimaryButton type="button" onClick={() => setModalOpen(true)}>Open modal</PrimaryButton>
            <SecondaryButton type="button" onClick={() => setDrawerOpen(true)}>Open drawer</SecondaryButton>
          </div>
        </Card>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Modal preview"
          footer={<SecondaryButton type="button" onClick={() => setModalOpen(false)}>Close</SecondaryButton>}
        >
          <p>This modal contains preview copy only.</p>
        </Modal>
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Drawer preview"
          footer={<SecondaryButton type="button" onClick={() => setDrawerOpen(false)}>Close</SecondaryButton>}
        >
          <p>This drawer contains preview copy only.</p>
        </Drawer>
      </div>
    </CustomerLayout>
  );
}

export function V2AdminShellPreview() {
  return (
    <AdminLayout
      title="Admin shell preview"
      breadcrumb={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Design foundation" },
      ]}
    >
      <div className="v2-preview-stack">
        <div>
          <Badge tone="gold">Preview only</Badge>
          <h1>Admin shell</h1>
          <p>Shared navigation and page structure, without live admin data or actions.</p>
          <Link className="v2-header-link" to="/system/v2-preview">Open customer/components preview</Link>
        </div>
        <Card title="Reusable admin content area">
          <EmptyState title="No live data connected" message="Dashboard and management APIs are not part of this design foundation." />
        </Card>
      </div>
    </AdminLayout>
  );
}
