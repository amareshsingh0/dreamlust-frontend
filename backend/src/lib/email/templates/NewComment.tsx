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

const commentBox = {
  backgroundColor: '#f7f7f7',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  borderLeft: '4px solid #007ee6',
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

interface NewCommentEmailProps {
  userName: string;
  contentTitle: string;
  contentId: string;
  commentText: string;
  frontendUrl: string;
}

export default function NewCommentEmail({
  userName,
  contentTitle,
  contentId,
  commentText,
  frontendUrl,
}: NewCommentEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>New Comment</Text>

          <Text style={text}>
            {userName} commented on your content "{contentTitle}"
          </Text>

          <Section style={commentBox}>
            <Text style={text}>"{commentText}"</Text>
          </Section>

          <Button
            href={`${frontendUrl}/watch/${contentId}`}
            style={button}
          >
            View Comment
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

