-- Enable RLS on all public tables and create permissive policies
-- Since the app uses Prisma with direct PostgreSQL connection, we allow all operations

-- Function to check if policy exists
CREATE OR REPLACE FUNCTION policy_exists(table_name text, policy_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = table_name
    AND policyname = policy_name
  );
END;
$$ LANGUAGE plpgsql;

-- Enable RLS and create policies for each table
DO $$
DECLARE
  tables text[] := ARRAY[
    'funnels',
    'user_preferences',
    'account_deletions',
    'content_flags',
    'live_streams',
    'live_chat_messages',
    'user_subscriptions',
    'creator_earnings',
    'user_loyalty',
    'rewards',
    'daily_stats',
    'gift_cards',
    'affiliates',
    'referrals',
    'email_queue',
    'notification_preferences',
    'push_subscriptions',
    'analytics_events',
    'follows',
    'feedback',
    'experiments',
    'experiment_assignments',
    'activity_feed',
    'feature_flags',
    'collections',
    'scheduled_content',
    'collection_items',
    'thumbnail_tests',
    'collaborations',
    'saved_searches',
    'search_history',
    'tips',
    'interactive_elements',
    'interactive_responses',
    'downloads',
    'series',
    'seasons',
    'episodes',
    'series_follows',
    'pricing_rules',
    'subscription_pauses',
    'promo_codes',
    'flash_sales',
    'churn_predictions',
    'cohort_metrics',
    'funnel_results',
    'content_restrictions',
    'retention_campaigns',
    'user_cohorts',
    'content_versions',
    'content_experiments',
    'regional_content',
    'multi_angle_content',
    'content_reviews',
    'content_review_comments',
    'comment_likes',
    'loyalty_transactions',
    'translations'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    -- Check if table exists before enabling RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      -- Drop existing policy if exists and create new one
      EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON public.%I', t);
      EXECUTE format('CREATE POLICY "Allow all for authenticated" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);

      RAISE NOTICE 'Enabled RLS on table: %', t;
    ELSE
      RAISE NOTICE 'Table does not exist: %', t;
    END IF;
  END LOOP;
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS policy_exists(text, text);
