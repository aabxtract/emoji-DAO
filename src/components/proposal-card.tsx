"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from "wagmi";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { emojiDaoAddress, emojiDaoAbi, VOTE_OPTIONS } from "@/lib/contracts";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ProposalCardProps = {
  proposalId: bigint;
};

export function ProposalCard({ proposalId }: ProposalCardProps) {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [isVoting, setIsVoting] = useState<number | null>(null);

  const { data: proposal, isLoading: isLoadingProposal, refetch: refetchProposal } = useReadContract({
    address: emojiDaoAddress,
    abi: emojiDaoAbi,
    functionName: 'getProposal',
    args: [proposalId],
  });

  const { data: userHasVoted, isLoading: isLoadingVotedStatus, refetch: refetchVotedStatus } = useReadContract({
    address: emojiDaoAddress,
    abi: emojiDaoAbi,
    functionName: 'hasVoted',
    args: [proposalId, address!],
    query: {
      enabled: !!address,
    },
  });

  const { data: hash, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useWatchContractEvent({
    address: emojiDaoAddress,
    abi: emojiDaoAbi,
    eventName: 'Voted',
    onLogs(logs) {
      // Check if the event is for this proposal
      const isForThisProposal = logs.some(log => (log as any).args.proposalId === proposalId);
      if (isForThisProposal) {
        refetchProposal();
        refetchVotedStatus();
      }
    },
  });

  const handleVote = (emojiType: number) => {
    setIsVoting(emojiType);
    writeContract({
      address: emojiDaoAddress,
      abi: emojiDaoAbi,
      functionName: 'vote',
      args: [proposalId, emojiType],
    });
  };

  useEffect(() => {
    if (isConfirmed) {
      toast({
        title: "Vote Cast!",
        description: "Your vote has been successfully recorded on-chain.",
      });
      setIsVoting(null);
    }
  }, [isConfirmed, toast]);
  
  const winningInfo = useMemo(() => {
    if (!proposal || !proposal.voteCounts) return { winningIndexes: [], maxVotes: 0n };
    const maxVotes = proposal.voteCounts.reduce((max, current) => (current > max ? current : max), 0n);
    const winningIndexes: number[] = [];
    if (maxVotes > 0) {
        proposal.voteCounts.forEach((count, index) => {
            if (count === maxVotes) {
                winningIndexes.push(index);
            }
        });
    }
    return { winningIndexes, maxVotes };
  }, [proposal]);

  if (isLoadingProposal || (isConnected && isLoadingVotedStatus)) {
    return <Skeleton className="h-52 w-full" />;
  }

  if (!proposal) {
    return null;
  }
  
  const totalVotes = proposal.voteCounts.reduce((sum, count) => sum + count, 0n);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline break-words">{proposal.description}</CardTitle>
        <CardDescription>
          Created {formatDistanceToNow(new Date(Number(proposal.createdAt) * 1000), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {VOTE_OPTIONS.map((option) => {
          const votes = proposal.voteCounts[option.value];
          const percentage = totalVotes > 0 ? (Number(votes) / Number(totalVotes)) * 100 : 0;
          const isWinning = winningInfo.winningIndexes.includes(option.value);
          const isThisButtonLoading = isVoting === option.value && (isConfirming || isVoting !== null);
          return (
            <div key={option.value} className="relative group">
              <Button
                variant="outline"
                className={cn(
                  "w-full h-24 flex flex-col gap-2 transition-all duration-300 relative overflow-hidden",
                   isWinning && "shadow-lg shadow-primary/50 border-primary",
                   userHasVoted && "bg-secondary"
                )}
                onClick={() => handleVote(option.value)}
                disabled={!isConnected || userHasVoted || isConfirming || isVoting !== null}
              >
                <span className="text-4xl">{option.emoji}</span>
                <span className="text-xl font-bold">{votes.toString()}</span>
                {isThisButtonLoading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </Button>
              <div className="absolute bottom-0 left-0 h-1 bg-primary rounded-b-md transition-all duration-500" style={{ width: `${percentage}%` }}/>
            </div>
          );
        })}
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          {userHasVoted ? "You have already voted on this proposal." : "You can vote once per proposal."}
        </p>
      </CardFooter>
    </Card>
  );
}
