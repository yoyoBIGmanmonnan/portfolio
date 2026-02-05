"use client";

export default function BackButton() {
    return (
        <button
            onClick={() => window.history.back()}
            className="hover:text-gray-900"
        >
            ← 上一頁
        </button>
    );
}
