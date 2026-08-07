import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { newEnforcer, newModelFromString, Enforcer } from 'casbin';
import { PrismaService } from '@app/database';

export const DEFAULT_CASBIN_MODEL = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && regexMatch(r.act, p.act)
`;

@Injectable()
export class CasbinService implements OnModuleInit {
  private enforcer: Enforcer;
  private readonly logger = new Logger(CasbinService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Initializing Casbin Enforcer with inline RBAC model...');
    const model = newModelFromString(DEFAULT_CASBIN_MODEL);
    this.enforcer = await newEnforcer(model);
    await this.loadPoliciesFromDb();
  }

  public getEnforcer(): Enforcer {
    return this.enforcer;
  }

  public async loadPoliciesFromDb(): Promise<void> {
    try {
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
    } catch (error) {
      this.logger.warn('Could not load Casbin policies from database (database may not be seeded yet).');
    }
  }

  public async enforce(sub: string, obj: string, act: string): Promise<boolean> {
    if (!this.enforcer) return false;
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
