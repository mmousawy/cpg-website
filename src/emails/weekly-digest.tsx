import { Column, Img, Link, Row, Section, Text } from '@react-email/components';

import type { NotificationWithActor } from '@/types/notifications';
import { getSupabaseStorageHosts } from '@/utils/supabaseHosts';

import EmailButton from './components/EmailButton';
import EmailHeading from './components/EmailHeading';
import EmailLayout from './components/EmailLayout';
import EmailText from './components/EmailText';
import {
  emailCalloutTitleStyle,
  emailDigestItemDividerStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from './components/styles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

function formatWithOthers(
  actor: string | null,
  otherCount: number,
  action: string,
): string {
  const name = actor || 'Someone';
  if (otherCount > 0) {
    return `${name} and ${otherCount} other${otherCount === 1 ? '' : 's'} ${action}`;
  }
  return `${name} ${action}`;
}

function formatCommentMessage(
  actor: string | null,
  data: NotificationWithActor['data'] | undefined,
  target: string,
): string {
  const otherCount = (data?.otherCount as number) || 0;
  const commentCount = (data?.commentCount as number) || 1;
  const name = actor || 'Someone';

  if (otherCount > 0) {
    return `${name} and ${otherCount} other${otherCount === 1 ? '' : 's'} commented on ${target}`;
  }
  if (commentCount > 1) {
    return `${name} commented ${commentCount} times on ${target}`;
  }
  return `${name} commented on ${target}`;
}

const notificationIcons: Record<string, string> = {
  like_photo: '🖼️',
  like_album: '📸',
  comment_photo: '💬',
  comment_album: '💬',
  comment_event: '💬',
  follow: '👤',
  followed_upload: '📷',
  event_reminder: '📅',
  event_announcement: '📢',
  admin_message: '⚙️',
  member_signed_up: '👋',
  member_joined: '👋',
  member_deleted: '🚪',
};

const notificationMessages: Record<string, (actor: string | null, data?: NotificationWithActor['data']) => string> = {
  like_photo: (actor, data) => formatWithOthers(actor, (data?.otherCount as number) || 0, 'liked your photo'),
  like_album: (actor, data) => formatWithOthers(actor, (data?.otherCount as number) || 0, 'liked your album'),
  comment_photo: (actor, data) => formatCommentMessage(actor, data, 'your photo'),
  comment_album: (actor, data) => formatCommentMessage(actor, data, 'your album'),
  comment_event: (actor, data) => formatCommentMessage(actor, data, 'the event'),
  follow: (actor) => `${actor || 'Someone'} started following you`,
  followed_upload: (actor, data) => {
    const count = (data?.photoCount as number) || 1;
    return `${actor || 'Someone'} uploaded ${count} new photo${count !== 1 ? 's' : ''}`;
  },
  event_reminder: () => 'Event reminder',
  event_announcement: () => 'New event announcement',
  admin_message: () => 'Admin message',
  member_signed_up: (actor) => `${actor || 'Someone'} signed up`,
  member_joined: (actor) => `${actor || 'Someone'} joined the community`,
  member_deleted: (actor) => `${actor || 'Someone'} scheduled their account for deletion`,
};

const SUPABASE_DOMAINS = getSupabaseStorageHosts();

function getResizedThumbnail(src: string | null | undefined, width = 96, quality = 80): string | undefined {
  if (!src) return undefined;

  const isSupabase = SUPABASE_DOMAINS.some(domain => src.includes(domain));

  if (isSupabase) {
    try {
      const url = new URL(src);
      url.pathname = url.pathname.replace(
        '/storage/v1/object/public/',
        '/storage/v1/render/image/public/',
      );
      url.searchParams.set('width', width.toString());
      url.searchParams.set('quality', quality.toString());
      return url.toString();
    } catch {
      return src;
    }
  }

  return src;
}

function formatUnreadCount(totalCount: number): string {
  const noun = totalCount === 1 ? 'notification' : 'notifications';
  return `${totalCount} unread ${noun}`;
}

export function getWeeklyDigestSubject(totalCount: number): string {
  return `Weekly digest: ${formatUnreadCount(totalCount)}`;
}

function getWeeklyDigestPreview(totalCount: number): string {
  return `Your weekly reminder — ${formatUnreadCount(totalCount)} from the past week`;
}

function formatNotificationDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Amsterdam',
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find(p => p.type === 'weekday')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '';
  const minute = parts.find(p => p.type === 'minute')?.value || '';
  return `${weekday}, ${month} ${day} at ${hour}:${minute}`;
}

export const WeeklyDigestEmail = ({
  preview,
  recipientName,
  recipientEmail,
  notifications,
  totalCount,
  activityPageUrl,
  unsubscribeUrl,
}: {
  preview?: boolean;
  recipientName: string;
  recipientEmail?: string;
  notifications: NotificationWithActor[];
  totalCount: number;
  activityPageUrl: string;
  unsubscribeUrl?: string;
}) => {
  if (preview) {
    recipientName = 'Jane Doe';
    recipientEmail = 'jane.doe@example.com';
    notifications = [
      {
        id: '1',
        user_id: 'user-1',
        actor_id: 'actor-1',
        type: 'like_photo',
        entity_type: 'photo',
        entity_id: 'photo-1',
        data: { title: 'Sunset at the beach', thumbnail: 'https://example.com/photo.jpg', link: `${baseUrl}/photos/photo-1` },
        seen_at: null,
        dismissed_at: null,
        created_at: new Date().toISOString(),
        actor: { nickname: 'johnsmith', avatar_url: null, full_name: 'John Smith' },
      },
      {
        id: '2',
        user_id: 'user-1',
        actor_id: 'actor-2',
        type: 'comment_album',
        entity_type: 'album',
        entity_id: 'album-1',
        data: { title: 'Street Photography', thumbnail: 'https://example.com/album.jpg', link: `${baseUrl}/albums/album-1` },
        seen_at: null,
        dismissed_at: null,
        created_at: new Date().toISOString(),
        actor: { nickname: 'sarahj', avatar_url: null, full_name: 'Sarah Johnson' },
      },
    ];
    totalCount = 12;
    activityPageUrl = `${baseUrl}/account/activity`;
    unsubscribeUrl = `${baseUrl}/unsubscribe/preview-token`;
  }

  const previewText = getWeeklyDigestPreview(totalCount);

  const renderNotificationContent = (
    message: string,
    title: string | undefined,
    formattedDate: string,
  ) => (
    <>
      <Text
        style={{ ...emailCalloutTitleStyle, marginBottom: '4px', lineHeight: '20px' }}
      >
        {message}
      </Text>
      {title && (
        <Text
          style={{ ...emailMutedTextStyle, marginBottom: '4px', fontSize: '13px', lineHeight: '18px' }}
        >
          {title}
        </Text>
      )}
      <Text
        style={{ ...emailMutedTextStyle, fontSize: '12px', lineHeight: '16px', color: '#999999' }}
      >
        {formattedDate}
      </Text>
    </>
  );

  return (
    <EmailLayout
      previewText={previewText}
      fullName={recipientName}
      recipientEmail={recipientEmail}
      optOutLink={unsubscribeUrl}
      emailType="notifications"
    >
      <EmailHeading>
        Weekly digest
      </EmailHeading>

      <EmailText>
        Hi
        {' '}
        {recipientName}
        ,
      </EmailText>
      <br />
      <EmailText>
        You have
        {' '}
        {formatUnreadCount(totalCount)}
        {' '}
        from the past week. Here&apos;s a summary:
      </EmailText>

      <Section
        style={{ margin: '20px 0' }}
      >
        {notifications.map((notification, index) => {
          const actorName = notification.actor?.full_name
            || notification.actor?.nickname
            || (notification.data?.actorName as string | undefined)
            || null;
          const messageText = notificationMessages[notification.type]?.(actorName, notification.data) || 'New notification';
          const icon = notificationIcons[notification.type] || '🔔';
          const message = `${icon} ${messageText}`;
          const title = notification.data?.title as string | undefined;
          const thumbnail = getResizedThumbnail(notification.data?.thumbnail as string | undefined);
          const link = notification.data?.link as string | undefined;
          const formattedDate = formatNotificationDate(notification.created_at);

          return (
            <Section
              key={notification.id}
              style={index > 0 ? emailDigestItemDividerStyle : undefined}
            >
              <Row>
                {thumbnail && (
                  <Column
                    width="48"
                  >
                    <Img
                      src={thumbnail}
                      width="48"
                      height="48"
                      alt={title || ''}
                      style={{ borderRadius: '6px', objectFit: 'cover' }}
                    />
                  </Column>
                )}
                <Column
                  style={{ verticalAlign: 'top', paddingLeft: thumbnail ? '12px' : 0 }}
                >
                  {link ? (
                    <Link
                      href={link}
                      style={{ textDecoration: 'none', color: emailTextStyle.color }}
                    >
                      {renderNotificationContent(message, title, formattedDate)}
                    </Link>
                  ) : (
                    renderNotificationContent(message, title, formattedDate)
                  )}
                </Column>
              </Row>
            </Section>
          );
        })}
      </Section>

      {totalCount > notifications.length && (
        <EmailText
          variant="muted"
          style={{ fontSize: '14px', lineHeight: '24px' }}
        >
          ... and
          {' '}
          {totalCount - notifications.length}
          {' '}
          more notification
          {totalCount - notifications.length === 1 ? '' : 's'}
        </EmailText>
      )}

      <Section
        style={{ margin: '20px 0' }}
      >
        <EmailButton
          href={activityPageUrl}
          variant="primary"
          style={{ marginTop: 0 }}
        >
          {totalCount === 1 ? (
            'View all notifications'
          ) : (
            <>
              View all
              {' '}
              {totalCount}
              {' '}
              notifications
            </>
          )}
        </EmailButton>
      </Section>
    </EmailLayout>
  );
};

export default WeeklyDigestEmail;
