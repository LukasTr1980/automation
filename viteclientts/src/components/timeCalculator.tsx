const getLast24Hours = (): { from: number; to: number } => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // Subtract 24 hours

    // Convert to timestamps (in milliseconds)
    const toTimestamp = now.getTime();
    const fromTimestamp = oneDayAgo.getTime();

    return { from: fromTimestamp, to: toTimestamp };
}

export { getLast24Hours };
