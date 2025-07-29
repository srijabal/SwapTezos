import HistoryTable from "../../components/HistoryTable";

export default function HistoryPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-8">Swap History</h1>
      <HistoryTable />
    </div>
  );
}
