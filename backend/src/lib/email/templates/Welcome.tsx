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
  fontSize: '28px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  margin: '20px 0',
  textAlign: 'center' as const,
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

interface WelcomeEmailProps {
  username: string;
  frontendUrl: string;
}

export default function WelcomeEmail({
  username,
  frontendUrl,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Welcome to DreamLust!</Text>

          <Text style={text}>
            Hi {username},
          </Text>

          <Text style={text}>
            Thank you for joining our platform. We're excited to have you here!
          </Text>

          <Text style={text}>
            Get started by exploring amazing content from our creators.
          </Text>

          <Button
            href={frontendUrl}
            style={button}
          >
            Visit DreamLust
          </Button>

          <Text style={footer}>
            If you have any questions, feel free to reach out to our support team.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

