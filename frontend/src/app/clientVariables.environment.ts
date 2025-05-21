class client {
    private isLoggedIn: boolean = false;
    private JWT: string = "";

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
}
const clienteEntorno = new client();
export default clienteEntorno;