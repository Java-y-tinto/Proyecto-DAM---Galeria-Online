import { Cart } from "./services/graphql.service";

class client {
    private isLoggedIn: boolean = false;
    private JWT: string = "";
    private cart: Cart | null = null;
    private partnerId: Number | null = null;
    public getIsLoggedIn(): boolean {
        return this.isLoggedIn;
    }
    public setIsLoggedIn(value: boolean) {
        this.isLoggedIn = value;
    }
    public getJWT(): string {
        return this.JWT;
    }
    public setJWT(value: string) {
        this.JWT = value;
    }
    public getCart(): Cart | null {
        return this.cart;
    }
    public setCart(value: Cart | null) {
        this.cart = value;
    }
    public getPartnerId(): Number | null {
        return this.partnerId;
    }
    public setPartnerId(value: Number | null) {
        this.partnerId = value;
    }
}
const clienteEntorno = new client();
export default clienteEntorno;