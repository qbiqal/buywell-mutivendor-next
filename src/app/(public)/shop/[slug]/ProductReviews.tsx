"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import styles from "./product-detail.module.css";

interface ReviewRow {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  likeCount: number;
  createdAt: string;
  firstName: string;
  lastName: string | null;
}

export function ProductReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);

  async function load() {
    const json = await fetch(`/api/products/${slug}/reviews`).then((res) => res.json());
    if (json.success) setReviews(json.data);
  }

  useEffect(() => { load().catch(() => {}); }, [slug]);

  async function submit() {
    const json = await fetch(`/api/products/${slug}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, title, body }),
    }).then((res) => res.json());
    if (json.success) {
      setTitle("");
      setBody("");
      setRating(5);
      setMessage(json.message ?? "Review submitted for approval");
      return;
    }
    if (json.error?.toLowerCase().includes("authentication")) setLoginOpen(true);
    else setMessage(json.error ?? "Review failed");
  }

  async function like(id: string) {
    const json = await fetch(`/api/products/reviews/${id}/like`, { method: "POST" }).then((res) => res.json());
    if (json.success) {
      setReviews((rows) => rows.map((row) => row.id === id ? { ...row, likeCount: json.data.likeCount } : row));
      return;
    }
    if (json.error?.toLowerCase().includes("authentication")) setLoginOpen(true);
  }

  return (
    <section className={styles.reviews}>
      <h2 className={styles.sectionTitle}>Customer Reviews</h2>
      <div className={styles.reviewForm}>
        <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}/5</option>)}
        </select>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Review title" />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your review" />
        <Button type="button" variant="primary" onClick={submit} disabled={!body.trim()}>Submit Review</Button>
        {message && <p className={styles.reviewNotice}>{message}</p>}
      </div>
      <div className={styles.reviewList}>
        {reviews.map((review) => (
          <article key={review.id} className={styles.reviewItem}>
            <div>
              <strong>Rating {review.rating}/5</strong>
              <p>{review.title || "Review"} by {review.firstName} {review.lastName ?? ""}</p>
            </div>
            <p>{review.body}</p>
            <div className={styles.reviewActions}>
              <button type="button" onClick={() => like(review.id)}>Like ({review.likeCount})</button>
              <span>{new Date(review.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          </article>
        ))}
      </div>
      <Modal isOpen={loginOpen} onClose={() => setLoginOpen(false)} title="Login required" maxWidth="420px">
        <div className={styles.loginPrompt}>
          <p>Only members can review products or like reviews.</p>
          <Link href={`/login?redirect=/shop/${slug}`} className={styles.loginLink}>Login to continue</Link>
        </div>
      </Modal>
    </section>
  );
}
