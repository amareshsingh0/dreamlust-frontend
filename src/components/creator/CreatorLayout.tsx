import { ReactNode } from 'react';
import { Layout } from '@/components/layout/Layout';

interface CreatorLayoutProps {
  children: ReactNode;
}

export function CreatorLayout({ children }: CreatorLayoutProps) {
  return <Layout>{children}</Layout>;
}

