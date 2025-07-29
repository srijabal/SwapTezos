export default function HistoryTable() {
  return (
    <div className="bg-card p-6 rounded-lg shadow-lg mt-8">
      <h2 className="text-2xl font-bold mb-4 text-card-foreground">Swap History (Mock Data)</h2>
      <div className="mb-4">
        <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground mr-2">As a user</button>
        <button className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground">As a resolver</button>
      </div>
      <table className="min-w-full bg-muted text-muted-foreground">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b border-border">Swap ID</th>
            <th className="py-2 px-4 border-b border-border">From</th>
            <th className="py-2 px-4 border-b border-border">To</th>
            <th className="py-2 px-4 border-b border-border">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-2 px-4 border-b border-border">#001</td>
            <td className="py-2 px-4 border-b border-border">1 ETH</td>
            <td className="py-2 px-4 border-b border-border">300 XTZ</td>
            <td className="py-2 px-4 border-b border-border">Completed</td>
          </tr>
          <tr>
            <td className="py-2 px-4 border-b border-border">#002</td>
            <td className="py-2 px-4 border-b border-border">50 DAI</td>
            <td className="py-2 px-4 border-b border-border">15 kUSD</td>
            <td className="py-2 px-4 border-b border-border">Pending</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
