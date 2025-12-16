import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Section,
  Link,
} from '@react-email/components';
import * as React from 'react';

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const heading = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  margin: '20px 0',
};

const text = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#484848',
  margin: '16px 0',
};

const amountBox = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  textAlign: 'center' as const,
  border: '2px solid #007ee6',
};

const amount = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#007ee6',
  margin: '8px 0',
};

const button = {
  backgroundColor: '#007ee6',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  padding: '12px 20px',
  margin: '24px auto',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '32px',
  textAlign: 'center' as const,
};

const link = {
  color: '#007ee6',
  textDecoration: 'underline',
};

interface NewTipEmailProps {
  userName: string;
  amount: number;
  message?: string;
  frontendUrl: string;
}

export default function NewTipEmail({
  userName,
  amount,
  message,
  frontendUrl,
}: NewTipEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>You Received a Tip!</Text>

          <Text style={text}>
            {userName} sent you a tip
          </Text>

          <Section style={amountBox}>
            <Text style={amount}>${amount.toFixed(2)}</Text>
          </Section>

          {message && (
            <Section style={{ backgroundColor: '#f7f7f7', borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
              <Text style={text}>"{message}"</Text>
            </Section>
          )}

          <Button
            href={`${frontendUrl}/earnings`}
            style={button}
          >
            View Earnings
          </Button>

          <Text style={footer}>
            <Link href={`${frontendUrl}/settings/notifications`} style={link}>
              Manage preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

