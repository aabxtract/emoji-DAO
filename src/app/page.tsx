import { CreateProposal } from "@/components/create-proposal";
import { Header } from "@/components/layout/header";
import { ProposalList } from "@/components/proposal-list";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="mx-auto grid w-full max-w-3xl gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Proposals</h1>
            <p className="text-muted-foreground">
              Create and vote on daily decisions for the community using emojis.
            </p>
          </div>
          <CreateProposal />
          <Separator className="my-2" />
          <ProposalList />
        </div>
      </main>
    </div>
  );
}
