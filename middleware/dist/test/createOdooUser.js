import { registerUser } from "../services/auth.js";
(async () => {
    const user = await registerUser({ name: 'test', email: 'test@testing.com', passwd: '1234' });
    console.log(user);
});
