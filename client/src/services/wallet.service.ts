"use server";

import { retryFetcher } from ".";

interface WalletChallengeResponseDto {
  message: string;
}

interface WalletAddressResponseDto {
  id: string;
  walletAddress: string;
}

export async function createWalletChallenge() {
  return retryFetcher<WalletChallengeResponseDto>("/wallet/challenge", {
    method: "POST",
  });
}

export async function verifyWalletAddress(
  walletAddress: string,
  signature: string,
) {
  return retryFetcher<WalletAddressResponseDto>("/wallet/verify", {
    method: "POST",
    body: JSON.stringify({ walletAddress, signature }),
  });
}
