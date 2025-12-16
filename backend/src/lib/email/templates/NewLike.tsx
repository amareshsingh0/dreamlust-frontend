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

interface NewLikeEmailProps {
  userName: string;
  contentTitle: string;
  contentId: string;
  frontendUrl: string;
}

export default function NewLikeEmail({
  userName,
  contentTitle,
  contentId,
  frontendUrl,
}: NewLikeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>New Like</Text>

          <Text style={text}>
            {userName} liked your content "{contentTitle}"
          </Text>

          <Button
            href={`${frontendUrl}/watch/${contentId}`}
            style={button}
          >
            View Content
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

