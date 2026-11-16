"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import {
  createWalletChallenge,
  verifyWalletAddress,
} from "@/services/wallet.service";

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

function toHexMessage(message: string) {
  const bytes = new TextEncoder().encode(message);
  return `0x${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

function getWalletAddress(user: object) {
  return "walletAddress" in user && typeof user.walletAddress === "string"
    ? user.walletAddress
    : "";
}

export function WalletConnection() {
  const { data: session, isPending } = authClient.useSession();
  const [walletAddress, setWalletAddress] = useState(
    session ? getWalletAddress(session.user) : "",
  );
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (session) {
      setWalletAddress(getWalletAddress(session.user));
    }
  }, [session]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("No compatible browser wallet was found");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        throw new Error("The wallet did not return an account");
      }
      const address = accounts[0];
      const { data: challenge } = await createWalletChallenge();
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [toHexMessage(challenge.message), address],
      });
      if (typeof signature !== "string") {
        throw new Error("The wallet did not return a signature");
      }

      console.log(address, signature);
      const { data } = await verifyWalletAddress(address, signature);
      setWalletAddress(data.walletAddress);
      toast.success("Wallet connected to your account");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to connect wallet",
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Blockchain wallet</h2>
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Wallet className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="font-medium">
                {walletAddress ? "Wallet connected" : "No wallet connected"}
              </p>
              <p className="break-all text-sm text-muted-foreground">
                {walletAddress ||
                  "Connect an EVM-compatible wallet to link it to your account."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                You will sign a verification message; no transaction is sent.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={walletAddress ? "outline" : "default"}
            disabled={isPending || isConnecting}
            onClick={connectWallet}
          >
            {isConnecting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Wallet className="size-4" />
            )}
            {walletAddress ? "Change wallet" : "Connect wallet"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
