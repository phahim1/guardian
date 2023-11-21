import {
    DIDDocument,
    DIDMessage,
    DatabaseServer,
    KeyType,
    MessageAction,
    MessageServer,
    Policy as PolicyCollection,
    PolicyTool as PolicyToolCollection,
    Schema as SchemaCollection
} from '@guardian/common';
import { GenerateUUIDv4, PolicyType, SchemaEntity } from '@guardian/interfaces';
import { IPolicyBlock, IPolicyInstance, IPolicyInterfaceBlock } from '@policy-engine/policy-engine.interface';
import { IPolicyUser } from '@policy-engine/policy-user';
import { Recording, Running } from '@policy-engine/record';
import { PolicyUtils } from './utils';

export class ComponentsService {
    public readonly topicId: string;
    public readonly policyId: string;
    public readonly dryRunId: string;

    private policyTokens: any[];
    private policyGroups: any[];
    private policyRoles: string[];
    private readonly schemasByID: Map<string, SchemaCollection>;
    private readonly schemasByType: Map<string, SchemaCollection>;
    private root: IPolicyBlock;

    /**
     * Database instance
     * @public
     */
    public readonly databaseServer: DatabaseServer;

    constructor(policy: PolicyCollection, policyId: string) {
        this.policyId = policyId;
        this.topicId = policy.topicId;
        if (policy && policy.status === PolicyType.DRY_RUN) {
            this.dryRunId = policyId;
        } else {
            this.dryRunId = null;
        }
        this.databaseServer = new DatabaseServer(this.dryRunId);
        this.policyTokens = [];
        this.policyGroups = [];
        this.policyRoles = [];
        this.schemasByID = new Map();
        this.schemasByType = new Map();
        this._recordingController = null;
        this._runningController = null;
    }

    /**
     * Load schema by type
     * @param type
     */
    public async loadSchemaByType(type: SchemaEntity): Promise<SchemaCollection> {
        return this.schemasByType.get(type);
    }

    /**
     * Load schema by id
     * @param id
     */
    public async loadSchemaByID(id: SchemaEntity): Promise<SchemaCollection> {
        return this.schemasByID.get(id);
    }

    /**
     * Load artifact by id
     * @param id
     */
    public async loadArtifactByID(uuid: string): Promise<string> {
        const artifactFile = await DatabaseServer.getArtifactFileByUUID(uuid);
        if (artifactFile) {
            return artifactFile.toString();
        }
        return null;
    }

    /**
     * Load token template by name
     * @param name
     */
    public getTokenTemplate<T>(name: string): T {
        return this.policyTokens.find((item) => item.templateTokenTag === name);
    }

    /**
     * Find Group Template
     * @param name
     */
    public getGroupTemplate<T>(name: string): T {
        return this.policyGroups.find(e => e.name === name) as T;
    }

    /**
     * Get Group Templates
     * @param name
     */
    public getGroupTemplates<T>(): T[] {
        return this.policyGroups as T[];
    }

    /**
     * Find Role Template
     * @param name
     */
    public getRoleTemplate<T>(name: string): T {
        return this.policyRoles.find(e => e === name) as T;
    }

    /**
     * Register Instance
     * @param name
     */
    public async registerPolicy(policy: PolicyCollection): Promise<void> {
        this.policyTokens = policy.policyTokens || [];
        this.policyGroups = policy.policyGroups || [];
        this.policyRoles = policy.policyRoles || [];
        if (policy.topicId) {
            const schemas = await DatabaseServer.getSchemas({ topicId: policy.topicId });
            for (const schema of schemas) {
                if (schema.readonly) {
                    this.schemasByType.set(schema.entity, schema);
                }
                this.schemasByID.set(schema.iri, schema);
            }
        }
    }

    /**
     * Register Instance
     * @param name
     */
    public async registerTool(tool: PolicyToolCollection): Promise<void> {
        if (tool.topicId) {
            const schemas = await DatabaseServer.getSchemas({ topicId: tool.topicId });
            for (const schema of schemas) {
                if (schema.readonly) {
                    this.schemasByType.set(schema.entity, schema);
                }
                this.schemasByID.set(schema.iri, schema);
            }
        }
    }

    /**
     * Register root
     * @param name
     */
    public async registerRoot(blockInstance: IPolicyBlock): Promise<void> {
        this.root = blockInstance;
    }

    /**
     * Select Policy Group
     * @param policy
     * @param user
     * @param uuid
     */
    public async selectGroup(
        user: IPolicyUser,
        uuid: string
    ): Promise<boolean> {
        const templates = this.getGroupTemplates<any>();
        if (templates.length === 0) {
            return false;
        }
        await this.databaseServer.setActiveGroup(
            this.policyId,
            user.did,
            uuid
        );
        return true;
    }

    public async generateUUID(): Promise<string> {
        if (this._runningController) {
            return await this._runningController.nextUUID();
        }
        const uuid = GenerateUUIDv4();
        if (this._recordingController) {
            await this._recordingController.generateUUID(uuid);
        }
        return uuid;
    }

    public async generateDID(topicId: string): Promise<DIDDocument> {
        if (this._runningController) {
            return await this._runningController.nextDID(topicId);
        }
        const didDocument = await DIDDocument.create(null, topicId);
        if (this._recordingController) {
            await this._recordingController.generateDidDocument(didDocument);
        }
        return didDocument;
    }

    private _recordingController: Recording;
    private _runningController: Running;

    public get recordingController(): Recording | null {
        return this._recordingController;
    }

    public get runningController(): Running | null {
        return this._runningController;
    }

    public get runAndRecordController(): Recording | Running | null {
        return this._recordingController || this._runningController;
    }

    public async startRecord(): Promise<boolean> {
        if (this._runningController) {
            return false;
        }
        if (!this._recordingController) {
            this._recordingController = new Recording(this.policyId);
        }
        return await this._recordingController.start();
    }

    public async runRecord(actions: any[], options: any): Promise<boolean> {
        if (this._recordingController) {
            return false;
        }
        if (!this._runningController) {
            this._runningController = new Running(
                this.root,
                this.policyId,
                actions,
                options
            );
        }
        return this._runningController.start();
    }

    public async stopRecord(): Promise<boolean> {
        if (this._runningController) {
            const old = this._runningController;
            this._runningController = null;
            return old.stop();
        }
        if (this._recordingController) {
            const old = this._recordingController;
            this._recordingController = null;
            return await old.stop();
        }
        return false;
    }
}