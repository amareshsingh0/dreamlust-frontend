/**
 * Subscription Management Page
 * User-facing page for managing subscriptions
 */

import { Layout } from '@/components/layout/Layout';
import { SubscriptionManager } from '@/components/subscriptions/SubscriptionManager';

export default function SubscriptionManagement() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Subscription Management</h1>
        <SubscriptionManager />
      </div>
    </Layout>
  );
}


