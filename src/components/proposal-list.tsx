"use client";

import { useReadContract, useWatchContractEvent } from "wagmi";
import { emojiDaoAddress, emojiDaoAbi } from "@/lib/contracts";
import { ProposalCard } from "./proposal-card";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Terminal } from "lucide-react";

export function ProposalList() {
  const { data: proposalsCount, isLoading, refetch } = useReadContract({
    address: emojiDaoAddress,
    abi: emojiDaoAbi,
    functionName: "proposalsCount",
  });

  useWatchContractEvent({
    address: emojiDaoAddress,
    abi: emojiDaoAbi,
    eventName: 'ProposalCreated',
    onLogs() {
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  const count = Number(proposalsCount);

  if (count === 0) {
    return (
       <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>No Proposals Yet!</AlertTitle>
        <AlertDescription>
          Be the first one to create a proposal and kickstart the decision-making process.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => count - 1 - i).map(
        (proposalId) => (
          <ProposalCard key={proposalId} proposalId={BigInt(proposalId)} />
        )
      )}
    </div>
  );
}
