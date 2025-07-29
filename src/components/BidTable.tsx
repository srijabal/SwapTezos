export default function BidTable() {
  return (
    <div className="bg-card p-6 rounded-lg shadow-lg mt-8">
      <h2 className="text-2xl font-bold mb-4 text-card-foreground">Active Auctions (Mock Data)</h2>
      <table className="min-w-full bg-muted text-muted-foreground">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b border-border">Auction ID</th>
            <th className="py-2 px-4 border-b border-border">From Token</th>
            <th className="py-2 px-4 border-b border-border">To Token</th>
            <th className="py-2 px-4 border-b border-border">Current Bid</th>
            <th className="py-2 px-4 border-b border-border">Time Left</th>
            <th className="py-2 px-4 border-b border-border">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-2 px-4 border-b border-border">#123</td>
            <td className="py-2 px-4 border-b border-border">ETH</td>
            <td className="py-2 px-4 border-b border-border">XTZ</td>
            <td className="py-2 px-4 border-b border-border">100 ETH</td>
            <td className="py-2 px-4 border-b border-border">00:01:30</td>
            <td className="py-2 px-4 border-b border-border">
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-1 px-3 rounded">Bid</button>
            </td>
          </tr>
          <tr>
            <td className="py-2 px-4 border-b border-border">#124</td>
            <td className="py-2 px-4 border-b border-border">DAI</td>
            <td className="py-2 px-4 border-b border-border">kUSD</td>
            <td className="py-2 px-4 border-b border-border">500 DAI</td>
            <td className="py-2 px-4 border-b border-border">00:05:00</td>
            <td className="py-2 px-4 border-b border-border">
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-1 px-3 rounded">Bid</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-4">
        <h3 className="text-xl font-bold mb-2 text-card-foreground">Submit a Bid (Mock)</h3>
        <input type="text" placeholder="Auction ID" className="shadow appearance-none border border-input rounded w-full py-2 px-3 bg-background text-foreground leading-tight focus:outline-none focus:ring-2 focus:ring-ring mb-2" />
        <input type="number" placeholder="Bid Amount" className="shadow appearance-none border border-input rounded w-full py-2 px-3 bg-background text-foreground leading-tight focus:outline-none focus:ring-2 focus:ring-ring mb-2" />
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-ring w-full">Submit Bid</button>
      </div>
    </div>
  );
}
