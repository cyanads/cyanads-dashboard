const ALLOWED_EMAILS = [
  "roy@cyanads.com",
  "sgl.roy@gmail.com"
];

export default NextAuth({
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
});
