import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

import type { NotificationWithActor } from '@/types/notifications';
import Footer from './components/Footer';
import EmailHeader from './components/Header';

const notificationIcons: Record<string, string> = {
  like_photo: '🖼️',
  like_album: '📸',
  comment_photo: '💬',
  comment_album: '💬',
  comment_event: '💬',
  follow: '👤',
  event_reminder: '📅',
  event_announcement: '📢',
  admin_message: '⚙️',
};

const notificationMessages: Record<string, (actor: string | null) => string> = {
  like_photo: (actor) => `${actor || 'Someone'} liked your photo`,
  like_album: (actor) => `${actor || 'Someone'} liked your album`,
  comment_photo: (actor) => `${actor || 'Someone'} commented on your photo`,
  comment_album: (actor) => `${actor || 'Someone'} commented on your album`,
  comment_event: (actor) => `${actor || 'Someone'} commented on the event`,
  follow: (actor) => `${actor || 'Someone'} started following you`,
  event_reminder: () => 'Event reminder',
  event_announcement: () => 'New event announcement',
  admin_message: () => 'Admin message',
};

// Supabase storage domains for image transformation
const SUPABASE_DOMAINS = [
  'db.creativephotography.group',
  'lpdjlhlslqtdswhnchmv.supabase.co',
];

// Get resized thumbnail URL for Supabase images
function getResizedThumbnail(src: string | null | undefined, width = 96, quality = 80): string | undefined {
  if (!src) return undefined;

  const isSupabase = SUPABASE_DOMAINS.some(domain => src.includes(domain));

  if (isSupabase) {
    try {
      const url = new URL(src);
      // Convert object URL to render/image URL for transformations
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

// Format date in Amsterdam time: "Sat, Jan 31 at 14:25"
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
  notifications,
  totalCount,
  activityPageUrl,
  unsubscribeUrl,
}: {
  preview?: boolean;
  recipientName: string;
  notifications: NotificationWithActor[];
  totalCount: number;
  activityPageUrl: string;
  unsubscribeUrl?: string;
}) => {
  if (preview) {
    recipientName = 'Jane Doe';
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

  const previewText = `You have ${totalCount} new notification${totalCount === 1 ? '' : 's'}`;

  return (
    <Html>
      <Head />
      <Preview>
        {previewText}
      </Preview>
      <Tailwind>
        <Body
          className="m-auto bg-[#f7f7f7] p-2 font-sans"
        >
          <Container
            className="mx-auto max-w-[465px] border-separate rounded-lg border border-solid border-[#e5e7ea] bg-white p-5"
          >
            <EmailHeader />

            <Heading
              className="mx-0 mb-[30px] p-0 text-[16px] font-semibold text-[#171717]"
            >
              You have
              {' '}
              {totalCount}
              {' '}
              new notification
              {totalCount === 1 ? '' : 's'}
            </Heading>

            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Hi
              {' '}
              {recipientName}
              ,
            </Text>
            <Text
              className="text-[14px] leading-[24px] text-[#171717]"
            >
              Here are your recent notifications from the past week:
            </Text>

            {/* Notifications list */}
            <Section
              className="my-[20px]"
            >
              {notifications.map((notification, index) => {
                const actorName = notification.actor?.full_name || notification.actor?.nickname || null;
                const message = notificationMessages[notification.type]?.(actorName) || 'New notification';
                const icon = notificationIcons[notification.type] || '🔔';
                const title = notification.data?.title as string | undefined;
                const thumbnail = getResizedThumbnail(notification.data?.thumbnail as string | undefined);
                const link = notification.data?.link as string | undefined;
                const formattedDate = formatNotificationDate(notification.created_at);

                return (
                  <Section
                    key={notification.id}
                    className={index > 0 ? 'mt-4 border-t border-[#e5e7ea] pt-4' : ''}
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
                            className="rounded-md object-cover"
                          />
                        </Column>
                      )}
                      <Column
                        className={thumbnail ? 'pl-3 align-top' : 'align-top'}
                      >
                        {link ? (
                          <Link
                            href={link}
                            className="no-underline"
                          >
                            <Text
                              className="my-0! mb-1! text-[14px] font-semibold leading-[20px] text-[#171717]"
                            >
                              {icon}
                              {' '}
                              {message}
                            </Text>
                            {title && (
                              <Text
                                className="my-0! mb-1! text-[13px] leading-[18px] text-[#666666]"
                              >
                                {title}
                              </Text>
                            )}
                            <Text
                              className="my-0! text-[12px] leading-[16px] text-[#999999]"
                            >
                              {formattedDate}
                            </Text>
                          </Link>
                        ) : (
                          <>
                            <Text
                              className="my-0! mb-1! text-[14px] font-semibold leading-[20px] text-[#171717]"
                            >
                              {icon}
                              {' '}
                              {message}
                            </Text>
                            {title && (
                              <Text
                                className="my-0! mb-1! text-[13px] leading-[18px] text-[#666666]"
                              >
                                {title}
                              </Text>
                            )}
                            <Text
                              className="my-0! text-[12px] leading-[16px] text-[#999999]"
                            >
                              {formattedDate}
                            </Text>
                          </>
                        )}
                      </Column>
                    </Row>
                  </Section>
                );
              })}
            </Section>

            {/* More notifications indicator */}
            {totalCount > notifications.length && (
              <Text
                className="text-[14px] leading-[24px] text-[#666666]"
              >
                ... and
                {' '}
                {totalCount - notifications.length}
                {' '}
                more notification
                {totalCount - notifications.length === 1 ? '' : 's'}
              </Text>
            )}

            {/* CTA Button */}
            <div
              className="my-[20px]"
            >
              <Link
                href={activityPageUrl}
                className="inline-block rounded-full bg-[#38785f] px-5 py-3 text-center font-mono text-[14px] font-semibold text-white no-underline"
              >
                {
                  totalCount === 1 ? 'View all notifications' : <>
                    View all
                    {' '}
                    {totalCount}
                    {' '}
                    notifications
                  </>
                }
              </Link>
            </div>

            <Footer
              fullName={recipientName}
              optOutLink={unsubscribeUrl}
              emailType="notifications"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default WeeklyDigestEmail;
