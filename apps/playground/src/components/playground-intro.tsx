export function PlaygroundIntro() {
  return (
    <div className="border-b border-black/8 pb-5 md:flex md:items-end md:justify-between md:gap-10">
      <h1 className="text-4xl leading-[0.98] font-semibold tracking-[-0.05em] sm:text-5xl">
        Live chat,
        <br />
        ready to embed.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-[#62665e] md:mt-0 md:max-w-md md:pb-0.5">
        A browser SDK and composable React widget with authenticated history,
        resumable WebSockets, and reconnect handling built in.
      </p>
    </div>
  );
}
