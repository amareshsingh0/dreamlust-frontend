/**
 * Admin Funnel Analytics Page
 * Full-featured funnel analysis dashboard
 */

import { Layout } from '@/components/layout/Layout';
import { FunnelDashboard } from '@/components/analytics/FunnelDashboard';

export default function FunnelAnalyticsPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Funnel Analytics</h1>
          <p className="text-muted-foreground">
            Track and analyze user conversion funnels
          </p>
        </div>
        <FunnelDashboard />
      </div>
    </Layout>
  );
}

