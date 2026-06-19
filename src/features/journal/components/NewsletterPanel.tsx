export function NewsletterPanel() {
  return (
    <section className="bg-ink px-6 md:px-8 py-20 text-center">
      <div className="max-w-[500px] mx-auto">
        <h2 className="font-display text-[32px] font-normal text-white mb-4">
          Stay connected
        </h2>
        <p className="text-[15px] leading-[1.7] text-[#888] mb-8">
          Subscribe to receive updates on new issues, calls for submissions, and community events.
        </p>
        <form className="flex flex-col sm:flex-row border border-white/15">
          <input
            type="email"
            placeholder="Your email"
            aria-label="Email address"
            className="flex-1 min-w-0 bg-transparent border-0 text-white px-5 py-3.5 text-[14px] placeholder:text-[#666] outline-none"
          />
          <button
            type="submit"
            className="bg-white text-ink px-7 py-3.5 text-[12px] font-bold tracking-[0.08em] uppercase cursor-pointer border-0"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
