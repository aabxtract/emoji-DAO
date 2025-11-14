"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { emojiDaoAddress, emojiDaoAbi } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";
import { useEffect } from "react";

const formSchema = z.object({
  description: z.string().min(10, {
    message: "Proposal must be at least 10 characters.",
  }).max(500, {
    message: "Proposal cannot be more than 500 characters."
  }),
});

export function CreateProposal() {
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const { data: hash, error, isPending, writeContract } = useWriteContract();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    writeContract({
      address: emojiDaoAddress,
      abi: emojiDaoAbi,
      functionName: "createProposal",
      args: [values.description],
    });
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      toast({
        title: "Proposal Created!",
        description: "Your proposal is now live for voting.",
      });
      form.reset();
    }
    if(error) {
      toast({
        title: "Error Creating Proposal",
        description: error.shortMessage || "An unknown error occurred.",
        variant: "destructive",
      });
    }
  }, [isConfirmed, error, toast, form]);

  if (!isConnected) {
    return (
      <div className="p-4 rounded-lg border bg-card text-card-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Please connect your wallet to create a proposal.</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Proposal</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What should we decide on today? e.g., 'Deploy the new frontend to production?'"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending || isConfirming} className="w-full md:w-auto">
          {(isPending || isConfirming) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isConfirming ? 'Confirming...' : 'Submitting...'}
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Proposal
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
