'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { Button } from '../ui/button';

interface BackButtonProps {
  className?: string;
  url?: string;
}

const SharedBackButton: React.FC<BackButtonProps> = ({
  className = '',
  url = '/',
}) => {
  const router = useRouter();
  return (
    <Button
      type="button"
      className="rounded-full aspect-square px-0 bg-background hover:bg-background/75"
      onClick={() => {
        if (window.history.state && window.history.state.idx > 0) {
          router.back();
        } else {
          router.push(url);
        }
      }}
    >
      <div className="aspect-square">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          aria-hidden="true"
          className="h-5 w-5 text-foreground"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          ></path>
        </svg>
      </div>
    </Button>
  );
};

export default SharedBackButton;
