import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Img,
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

const title = {
  fontSize: '20px',
  lineHeight: '1.4',
  fontWeight: '600',
  color: '#484848',
  margin: '16px 0',
};

const description = {
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

interface NewUploadEmailProps {
  creator: {
    name: string;
    handle?: string;
    avatar?: string;
  };
  content: {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
  };
  user: {
    username?: string;
    display_name?: string;
  };
  frontendUrl: string;
}

export default function NewUploadEmail({
  creator,
  content,
  user,
  frontendUrl,
}: NewUploadEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {content.thumbnailUrl && (
            <Img
              src={content.thumbnailUrl}
              alt={content.title}
              width="600"
              height="337"
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />
          )}

          <Text style={heading}>
            {creator.name} just uploaded a new video!
          </Text>

          <Text style={title}>{content.title}</Text>

          {content.description && (
            <Text style={description}>
              {content.description}
            </Text>
          )}

          <Button
            href={`${frontendUrl}/watch/${content.id}`}
            style={button}
          >
            Watch Now
          </Button>

          <Text style={footer}>
            You're receiving this because you follow {creator.name}.
            <br />
            <Link href={`${frontendUrl}/settings/notifications`} style={link}>
              Manage preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

