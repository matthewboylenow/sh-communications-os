// The parish is in Westfield NJ. Vercel runs UTC. Several date bugs only
// appear when those two disagree, so pin the zone for every test run.
process.env.TZ = "America/New_York";
