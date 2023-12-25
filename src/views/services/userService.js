class UserSevice {

    #user
    #onUserUpdate = []

    subscribeOnUpdateUser(callback) {
        this.#onUserUpdate.push(callback)
    }

    #publishUserUpdate(user) {
        this.#onUserUpdate.forEach(callback=>{
            try {
                console.log("callback")
                callback(user)
            } catch (error) {
                console.error(error)
            }
        })
    }

    async loadUser(user) {
        const params = new URLSearchParams({user});
        const response = await fetch(`/api/user?` + params.toString());

        if (response.ok) {
            const newUser = (await response.json()).data;
            if (!newUser) throw new Error(`user "${user}" does not exist`)
            this.#user = newUser
            this.#publishUserUpdate(newUser)
            return newUser; 
        }
        throw new Error("Get user request failed!")
    }

    async upadteUserAttributes(attributes) {
        if (!attributes.userName) attributes.userName = this.#user.userName
        const response = await fetch("/api/user", {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attributes)
        });
        if (!response.ok) {
            throw new Error("user PUT request failed!")
        }
    }
}

export const getNewUserSeviceInstance = () => (new UserSevice())
export default new UserSevice();