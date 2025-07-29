export default function WalletConnect() {
  return (
    <div className="flex items-center space-x-4">
      <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
        Connect Ethereum Wallet
      </button>
      <button className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90">
        Connect Tezos Wallet
      </button>
    </div>
  );
}
