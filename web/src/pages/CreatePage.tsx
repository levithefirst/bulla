import { CreateInvoiceForm } from "../components/CreateInvoiceForm";
import { QueryProvider } from "../lib/query";
import { navigate } from "../router";

export default function CreatePage() {
  return (
    <QueryProvider>
      <CreateInvoiceForm onCreated={(id) => navigate(`/invoice/${id}`)} />
    </QueryProvider>
  );
}
