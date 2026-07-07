import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Star, MapPin, BadgeCheck, DoorOpen, ArrowLeft } from "lucide-react";
import { getRoom, getRoomReviews, getReviewContext } from "@/lib/data";
import { getCurrentUser, tenantDetailsComplete } from "@/lib/auth";
import { ROOM_TYPES, AMENITIES } from "@/lib/constants";
import { formatINR } from "@/lib/utils";
import { Card } from "@/components/ui";
import { AmenityIcon } from "@/components/amenity-icon";
import { RequestToRent } from "@/components/request-to-rent";
import { ReviewForm } from "@/components/review-form";
import { ReviewList } from "@/components/review-list";

export default async function RoomPage(props: PageProps<"/rooms/[id]">) {
  const { id } = await props.params;
  const [room, user, reviews, reviewCtx] = await Promise.all([
    getRoom(id),
    getCurrentUser(),
    getRoomReviews(id),
    getReviewContext(id),
  ]);

  if (!room) notFound();

  const typeLabel = ROOM_TYPES.find((t) => t.value === room.type)?.label ?? room.type;
  const amenityLabels = AMENITIES.filter((a) => room.amenities.includes(a.value));
  const photos = room.photos ?? [];
  const available = room.available_units ?? 0;
  const total = room.total_units ?? 1;
  const isFull = available === 0;
  const detailsComplete = tenantDetailsComplete(user?.profile);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {room.building_id && (
        <Link
          href={`/buildings/${room.building_id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={15} /> {room.building?.name ? `Back to ${room.building.name}` : "Back to building"}
        </Link>
      )}

      {/* Gallery */}
      <div className="grid gap-2 overflow-hidden rounded-[var(--radius-card)] sm:grid-cols-2">
        <div className="relative aspect-[4/3] bg-[var(--surface-2)] sm:aspect-auto">
          {photos[0] ? (
            <Image src={photos[0].url} alt={room.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
          ) : (
            <div className="grid h-full min-h-[260px] place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)]">
              <span className="text-4xl font-extrabold tracking-tight text-[var(--primary)]/35">Rent-tok</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="relative aspect-[4/3] bg-[var(--surface-2)]">
              {photos[i] ? (
                <Image src={photos[i].url} alt="" fill className="object-cover" sizes="25vw" />
              ) : (
                <div className="grid h-full place-items-center text-xl font-bold text-[var(--primary)]/30">+</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium">{typeLabel}</span>
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${isFull ? "bg-[var(--surface-2)] text-[var(--muted)]" : "bg-green-500/15 text-green-600 dark:text-green-400"}`}>
              <DoorOpen size={13} /> {isFull ? "Fully booked" : `${available} of ${total} available`}
            </span>
            {room.rating != null && (
              <span className="flex items-center gap-1 text-sm">
                <Star size={15} className="fill-yellow-400 text-yellow-400" /> {room.rating}
                <span className="text-[var(--muted)]">({room.review_count} reviews)</span>
              </span>
            )}
          </div>

          <h1 className="mt-3 text-3xl font-extrabold">{room.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-[var(--muted)]">
            <MapPin size={16} /> {room.address}
          </p>

          {room.description && (
            <p className="mt-6 leading-relaxed text-[var(--foreground)]/90">{room.description}</p>
          )}

          <section className="mt-8">
            <h2 className="text-lg font-bold">Amenities</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {amenityLabels.map((a) => (
                <div key={a.value} className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm">
                  <AmenityIcon value={a.value} size={17} className="text-[var(--primary)]" /> {a.label}
                </div>
              ))}
            </div>
          </section>

          {room.rules && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">House rules</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-[var(--muted)]">{room.rules}</p>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-lg font-bold">Reviews</h2>
            {reviewCtx.canReview && (
              <div className="mt-3">
                <ReviewForm roomId={room.id} initial={reviewCtx.myReview} />
              </div>
            )}
            <div className="mt-4">
              <ReviewList reviews={reviews} />
            </div>
          </section>
        </div>

        {/* Booking card */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="p-6">
            <div className="flex items-end gap-1">
              <span className="text-3xl font-extrabold">{formatINR(room.rent)}</span>
              <span className="pb-1 text-[var(--muted)]">/ month</span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Deposit {formatINR(room.deposit)}
            </p>

            <p className="mt-1 text-sm text-[var(--muted)]">
              {isFull ? "Fully booked" : `${available} of ${total} available`}
            </p>

            <div className="my-5 h-px bg-[var(--border)]" />

            {isFull ? (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-full border border-[var(--border)] bg-[var(--surface-2)] py-3 text-sm font-medium text-[var(--muted)]"
              >
                Fully booked
              </button>
            ) : (
              <RequestToRent
                roomId={room.id}
                roomTitle={`${room.building?.name ? room.building.name + " · " : ""}${room.title}`}
                isLoggedIn={Boolean(user)}
                detailsComplete={detailsComplete}
              />
            )}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--muted)]">
              <BadgeCheck size={12} /> Free — your request joins the owner&apos;s queue instantly
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
