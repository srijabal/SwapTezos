import BidTable from "../../components/BidTable";

export default function ResolverPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-8">Resolver Dashboard</h1>
      <BidTable />
    </div>
  );
}
