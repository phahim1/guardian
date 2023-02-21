import { Singleton } from '@helpers/decorators/singleton';
import { ServiceRequestsBase } from '@helpers/service-requests-base';
import { Wallet as WalletManager} from '@guardian/common'
import { Users } from './users';

/**
 * Key type
 */
export enum KeyType {
    ID = 'ID',
    KEY = 'KEY',
    TOKEN_TREASURY_KEY = 'TOKEN_TREASURY_KEY',
    TOKEN_ADMIN_KEY = 'TOKEN_ADMIN_KEY',
    TOKEN_SUPPLY_KEY = 'TOKEN_SUPPLY_KEY',
    TOKEN_FREEZE_KEY = 'TOKEN_FREEZE_KEY',
    TOKEN_KYC_KEY = 'TOKEN_KYC_KEY',
    TOKEN_WIPE_KEY = 'TOKEN_WIPE_KEY',
    TOPIC_SUBMIT_KEY = 'TOPIC_SUBMIT_KEY',
    TOPIC_ADMIN_KEY = 'TOPIC_ADMIN_KEY'
}

/**
 * Wallet service
 */
@Singleton
export class Wallet extends ServiceRequestsBase {
    /**
     * Message broker target
     */
    public target: string = 'auth-service'

    /**
     * Return key
     * @param token
     * @param type
     * @param key
     */
    public async getKey(token: string, type: KeyType, key: string): Promise<string> {
        const wallet = new WalletManager();
        return await wallet.getKey(token, type, key);
    }

    /**
     * Set key
     * @param token
     * @param type
     * @param key
     * @param value
     */
    public async setKey(token: string, type: string, key: string, value: string) {
        const wallet = new WalletManager();
        await wallet.setKey(token, type, key, value);
    }

    /**
     * Return key
     * @param did
     * @param key
     */
     public async getUserKey(did: string, type: KeyType, key: string): Promise<any> {
        const user = new Users();
        const { walletToken } = await user.getUserById(did);

        const wallet = new WalletManager();
        return await wallet.getKey(walletToken, type, key);
    }

    /**
     * Set key
     * @param token
     * @param type
     * @param key
     * @param value
     */
    public async setUserKey(did: string, type: KeyType, key: string, value: any) {
        const user = new Users();
        const { walletToken } = await user.getUserById(did);

        const wallet = new WalletManager();
        await wallet.setKey(walletToken, type, key, value);
    }
}
