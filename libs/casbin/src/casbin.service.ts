import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { newEnforcer, Enforcer } from 'casbin';
import * as path from 'path';
import { PrismaService } from '@app/database';

@Injectable()
export class CasbinService implements OnModuleInit {
  private enforcer: Enforcer;
  private readonly logger = new Logger(CasbinService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const modelPath = path.resolve(__dirname, 'rbac_model.conf');
    this.logger.log(`Initializing Casbin Enforcer with model: ${modelPath}`);
    
    // In-memory or Database backed Enforcer Initialization
    this.enforcer = await newEnforcer(modelPath);
    await this.loadPoliciesFromDb();
  }

  public getEnforcer(): Enforcer {
    return this.enforcer;
  }

  public async loadPoliciesFromDb(): Promise<void> {
    const rules = await this.prisma.casbinRule.findMany();
    this.enforcer.clearPolicy();

    for (const rule of rules) {
      if (rule.ptype === 'p' && rule.v0 && rule.v1 && rule.v2) {
        await this.enforcer.addPolicy(rule.v0, rule.v1, rule.v2);
      } else if (rule.ptype === 'g' && rule.v0 && rule.v1) {
        await this.enforcer.addGroupingPolicy(rule.v0, rule.v1);
      }
    }

    this.logger.log(`Loaded ${rules.length} Casbin policies from database.`);
  }

  public async enforce(sub: string, obj: string, act: string): Promise<boolean> {
    return await this.enforcer.enforce(sub, obj, act);
  }

  public async getAllPolicies() {
    return await this.enforcer.getPolicy();
  }

  public async addPolicy(sub: string, obj: string, act: string): Promise<boolean> {
    const added = await this.enforcer.addPolicy(sub, obj, act);
    if (added) {
      await this.prisma.casbinRule.create({
        data: { ptype: 'p', v0: sub, v1: obj, v2: act },
      });
    }
    return added;
  }

  public async removePolicy(sub: string, obj: string, act: string): Promise<boolean> {
    const removed = await this.enforcer.removePolicy(sub, obj, act);
    if (removed) {
      await this.prisma.casbinRule.deleteMany({
        where: { ptype: 'p', v0: sub, v1: obj, v2: act },
      });
    }
    return removed;
  }
}
