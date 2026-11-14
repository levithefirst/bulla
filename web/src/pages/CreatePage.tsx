import { CreateInvoiceForm } from "../components/CreateInvoiceForm";
import { navigate } from "../router";

export function CreatePage() {
  return (
    <div className="narrow">
      <CreateInvoiceForm onCreated={(id) => navigate(`/invoice/${id}`)} />
    </div>
  );
}
