const awsParam = "5d26643c9bf758f00272ffed8558a0d9";
const awsParamUrl = "https://learn.eduflowpro.com/s/aws";
const API_KEY = "uXVeRpnkFYHhT8SQK6JXo";
const WS_ENDPOINT = `wss://eduflowpro.vitalstats.app/api/v1/graphql?apiKey=${API_KEY}`;
const HTTP_ENDPOINT = "https://eduflowpro.vitalstats.app/api/v1/graphql";
const PROTOCOL = "vitalstats";
const SUB_ID = "forum-subscription";
const KEEPALIVE_MS = 80000;
const MAX_BACKOFF = 30000;
const GLOBAL_AUTHOR_ID = 62;
const DEFAULT_AVATAR =
  "https://files.ontraport.com/media/b0456fe87439430680b173369cc54cea.php03bzcx?Expires=4895186056&Signature=fw-mkSjms67rj5eIsiDF9QfHb4EAe29jfz~yn3XT0--8jLdK4OGkxWBZR9YHSh26ZAp5EHj~6g5CUUncgjztHHKU9c9ymvZYfSbPO9JGht~ZJnr2Gwmp6vsvIpYvE1pEywTeoigeyClFm1dHrS7VakQk9uYac4Sw0suU4MpRGYQPFB6w3HUw-eO5TvaOLabtuSlgdyGRie6Ve0R7kzU76uXDvlhhWGMZ7alNCTdS7txSgUOT8oL9pJP832UsasK4~M~Na0ku1oY-8a7GcvvVv6j7yE0V0COB9OP0FbC8z7eSdZ8r7avFK~f9Wl0SEfS6MkPQR2YwWjr55bbJJhZnZA__&Key-Pair-Id=APKAJVAAMVW6XQYWSTNA";
let socket;
let backoff = 1000;
let keepAliveTimer;
let postsStore = [];
