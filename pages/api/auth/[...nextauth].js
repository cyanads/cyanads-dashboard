const NextAuth = require("next-auth").default;
const GoogleProvider = require("next-auth/providers/google").default;

const ALLOWED_EMAILS = [
  "roy@cyanads.com",
  "sgl.roy@gmail.com"
];

module.exports = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return ALLOWED_EMAILS.includes(user.email);
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
