import { WalletConnect } from "../wallet-connect";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <a href="/" className="mr-6 flex items-center space-x-2">
            <span className="text-2xl">😎</span>
            <span className="font-bold sm:inline-block font-headline">
              EmojiDAO
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}
