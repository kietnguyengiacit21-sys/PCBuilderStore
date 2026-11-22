import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { deleteReview, fetchProductReviews, submitReview } from "../reviews-api";
import type { ProductReviews as ProductReviewsData } from "../reviews-api";
import { useAuth } from "./auth";
import { PrimaryButton, SecondaryButton } from "./components";

const reviewDate = (value: string) => new Date(value.replace(" ", "T")).toLocaleDateString("vi-VN");

export function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return <span className={`v2-stars is-${size}`} role="img" aria-label={`${value.toLocaleString("vi-VN")} trên 5 sao`}>
    <span aria-hidden="true">★★★★★</span>
    <span className="v2-stars-fill" style={{ width: `${percent}%` }} aria-hidden="true">★★★★★</span>
  </span>;
}

/** Compact "★ 4,5 (12 đánh giá)" link for the product header; hidden until a review exists. */
export function ReviewBadge({ modelCode }: { modelCode: string }) {
  const [data, setData] = useState<ProductReviewsData>();
  useEffect(() => {
    const controller = new AbortController();
    void fetchProductReviews(modelCode, controller.signal).then(setData, () => undefined);
    return () => controller.abort();
  }, [modelCode]);
  if (!data?.summary.count) return null;
  return <a className="v2-review-badge" href="#reviews">
    <Stars value={data.summary.average} size="sm" />
    <strong>{data.summary.average.toLocaleString("vi-VN")}</strong>
    <span>({data.summary.count} đánh giá)</span>
  </a>;
}

export function ProductReviews({ modelCode, productName }: { modelCode: string; productName: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<ProductReviewsData>();
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [formMessage, setFormMessage] = useState<{ ok: boolean; text: string }>();

  const load = (signal?: AbortSignal) => fetchProductReviews(modelCode, signal).then((loaded) => {
    setData(loaded);
    if (loaded.mine) {
      setRating(loaded.mine.rating);
      setTitle(loaded.mine.title ?? "");
      setText(loaded.mine.text ?? "");
    }
  }, (reason: unknown) => {
    if (!signal?.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải đánh giá.");
  });
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [modelCode, user?.userId]);

  if (error) return null;
  if (!data || !data.summary.enabled) return null;
  const { summary, reviews, mine } = data;
  const isCustomer = user?.roleCode === "CUSTOMER";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!rating) {
      setFormMessage({ ok: false, text: "Hãy chọn số sao." });
      return;
    }
    setBusy(true);
    setFormMessage(undefined);
    void submitReview(modelCode, { rating, title, text })
      .then(() => load())
      .then(() => {
        setEditing(false);
        setFormMessage({ ok: true, text: "Cảm ơn bạn! Đánh giá sẽ hiển thị sau khi cửa hàng duyệt." });
      })
      .catch((reason: unknown) => setFormMessage({ ok: false, text: reason instanceof Error ? reason.message : "Không thể gửi đánh giá." }))
      .finally(() => setBusy(false));
  };
  const withdraw = () => {
    setBusy(true);
    void deleteReview(modelCode).then(() => {
      setRating(0); setTitle(""); setText(""); setFormMessage(undefined);
      return load();
    }).catch((reason: unknown) => setFormMessage({ ok: false, text: reason instanceof Error ? reason.message : "Không thể xóa." }))
      .finally(() => setBusy(false));
  };
  const showForm = isCustomer && (!mine || editing);

  return <section className="v2-reviews" id="reviews" aria-labelledby="reviews-title">
    <h2 id="reviews-title">Đánh giá {productName}</h2>
    <div className="v2-reviews-layout">
      <div className="v2-reviews-summary">
        <strong>{summary.count ? summary.average.toLocaleString("vi-VN") : "—"}<small>/5</small></strong>
        <Stars value={summary.average} size="lg" />
        <span>{summary.count ? `${summary.count} đánh giá đã duyệt` : "Chưa có đánh giá"}</span>
        <ol>{[5, 4, 3, 2, 1].map((star) => {
          const count = summary.distribution[String(star)] ?? 0;
          return <li key={star}>
            <span>{star} ★</span>
            <span className="v2-reviews-bar"><i style={{ width: `${summary.count ? (count / summary.count) * 100 : 0}%` }} /></span>
            <span>{count}</span>
          </li>;
        })}</ol>
      </div>

      <div className="v2-reviews-main">
        {!user && <div className="v2-reviews-cta">
          <p>Bạn đã dùng sản phẩm này? Chia sẻ trải nghiệm để giúp người mua sau.</p>
          <Link className="v2-button v2-button-secondary" to="/login">Đăng nhập để viết đánh giá</Link>
        </div>}
        {mine && !editing && <div className={`v2-reviews-mine is-${mine.status.toLowerCase()}`}>
          <div>
            <strong>Đánh giá của bạn</strong>
            <span>{mine.status === "PENDING" ? "Đang chờ duyệt" : mine.status === "APPROVED" ? "Đã hiển thị" : "Chưa được duyệt"}</span>
          </div>
          <Stars value={mine.rating} size="sm" />
          {mine.title && <b>{mine.title}</b>}
          <p>{mine.text}</p>
          <div className="v2-reviews-mine-actions">
            <SecondaryButton type="button" onClick={() => { setEditing(true); setFormMessage(undefined); }}>Sửa đánh giá</SecondaryButton>
            <SecondaryButton type="button" disabled={busy} onClick={withdraw}>Xóa</SecondaryButton>
          </div>
        </div>}
        {showForm && <form className="v2-reviews-form" onSubmit={submit}>
          <strong>{mine ? "Sửa đánh giá" : "Viết đánh giá"}</strong>
          {data.purchased && <span className="v2-reviews-verified">✓ Bạn đã mua sản phẩm này, đánh giá sẽ có nhãn "Đã mua hàng"</span>}
          <div className="v2-star-picker" role="radiogroup" aria-label="Số sao" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" role="radio" aria-checked={rating === star}
              aria-label={`${star} sao`} className={(hover || rating) >= star ? "is-on" : undefined}
              onMouseEnter={() => setHover(star)} onClick={() => setRating(star)}>★</button>)}
            <span>{["", "Rất tệ", "Chưa tốt", "Tạm được", "Tốt", "Tuyệt vời"][hover || rating]}</span>
          </div>
          <input className="v2-form-input" placeholder="Tiêu đề (không bắt buộc)" maxLength={200} value={title}
            onChange={(event) => setTitle(event.target.value)} aria-label="Tiêu đề đánh giá" />
          <textarea className="v2-form-input" rows={4} required minLength={10} maxLength={4000} value={text}
            placeholder="Sản phẩm dùng thế nào? Hiệu năng, độ ồn, nhiệt độ, đóng gói…" aria-label="Nội dung đánh giá"
            onChange={(event) => setText(event.target.value)} />
          <div className="v2-reviews-form-actions">
            {editing && <SecondaryButton type="button" onClick={() => setEditing(false)}>Hủy</SecondaryButton>}
            <PrimaryButton type="submit" disabled={busy}>{busy ? "Đang gửi…" : "Gửi đánh giá"}</PrimaryButton>
          </div>
        </form>}
        {formMessage && <p className={formMessage.ok ? "v2-inline-success" : "v2-inline-error"} role="status">{formMessage.text}</p>}

        {reviews.length ? <ul className="v2-reviews-list">{reviews.map((review) => <li key={review.reviewId}>
          <div className="v2-reviews-head">
            <strong>{review.authorName}</strong>
            {review.verifiedPurchase && <span className="v2-reviews-verified">✓ Đã mua hàng</span>}
            <time>{reviewDate(review.createdAt)}</time>
          </div>
          <Stars value={review.rating} size="sm" />
          {review.title && <b>{review.title}</b>}
          {review.text && <p>{review.text}</p>}
          {review.response && <div className="v2-reviews-response"><strong>PC Builder Store phản hồi</strong><p>{review.response}</p></div>}
        </li>)}</ul> : !mine && <p className="v2-muted">Chưa có đánh giá nào cho sản phẩm này.</p>}
      </div>
    </div>
  </section>;
}
