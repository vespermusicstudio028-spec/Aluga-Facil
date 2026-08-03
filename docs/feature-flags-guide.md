# Guia do Desenvolvedor: Sistema de Feature Flags (SaaS) 🚀

Este documento detalha o funcionamento da arquitetura SaaS baseada em Mapeamento de Permissões (Features/Limits). 
O sistema anterior dependia fortemente do hardcoding (`user.plan === 'premium'`). A nova abordagem desacopla o front-end dos "Planos", tornando a plataforma robusta para vendas modulares, permissões dinâmicas e proteção no banco de dados via Supabase Row-Level Security (RLS).

## 🛠 Como o Sistema Funciona

O fluxo principal baseia-se em relacionar um usuário a uma assinatura (`saas_subscriptions`), que é vinculada a um plano (`saas_plans`). Esse plano, por sua vez, possui **Features Ativas** (`saas_plan_features`) e **Limites Quantitativos** (`saas_plan_limits`).

No frontend, o usuário carrega o seu contexto de permissões via `FeatureContext.tsx`, que injeta globalmente a capacidade de fazer verificações usando o hook `useFeature()`.

---

## ➕ Como Adicionar uma Nova Feature (Passo-a-Passo)

### 1) Atualize o Enum no Frontend
Abra o arquivo `src/features/permissions.ts` e adicione o identificador da sua nova feature ao enum respectivo:

```typescript
export enum Feature {
  AGENDA = 'agenda',
  HELPDESK = 'helpdesk',
  MY_NEW_FEATURE = 'my_new_feature' // <- Sua nova funcionalidade
}
```

### 2) Cadastre a Feature no Banco de Dados (Supabase)
Você deve associar a feature aos planos que terão acesso a ela. Por via de regra, acesse sua interface do Supabase e rode o código para o Plano Professional e Premium:

```sql
INSERT INTO public.saas_plan_features (plan_id, feature)
VALUES 
((SELECT id FROM saas_plans WHERE name = 'premium'), 'my_new_feature'),
((SELECT id FROM saas_plans WHERE name = 'professional'), 'my_new_feature');
```
*(Lembre-se de vincular também ao plano `trial` nas migrations caso o teste gratuito deva liberar a funcionalidade).*

### 3) Aplique o Componente `<FeatureGuard>` na Interface
Onde quer que a interface deva bloquear o usuário sem a feature, envelopando o componente que dispara a ação. 

**Vantagem do FeatureGuard:** Ele não esconde o botão! Ele tranca-o visualmente (cadeado + bloqueio) e, quando o usuário clica, ele intercepta a ação abrindo um Popup de "Atuzalize seu Plano" (O famoso `UpgradeModal`).

```tsx
import { FeatureGuard } from '../features/components/FeatureGuard';
import { Feature } from '../features/permissions';

// Em um menu, botão, ou card na sua aplicação:
<FeatureGuard feature={Feature.MY_NEW_FEATURE}>
  <button onClick={suaAcaoSecretaEPremium}>
    Gerar Contrato Avançado
  </button>
</FeatureGuard>
```

### 4) Aplique Condicional de Componente/Logica Customizada
Se desejar fazer modificações lógicas no TSX ao invés de apenas usar a barreira `<FeatureGuard>`, puxe diretamente a verificação via Hook:

```tsx
import { useFeature } from '../features/useFeature';
import { Feature } from '../features/permissions';

const MeuComponente = () => {
    const { hasFeature } = useFeature();
    const canUse = hasFeature(Feature.MY_NEW_FEATURE);

    if(!canUse) {
        return <p>Compre o Premium para ver a mágica!</p>
    }
}
```

---

## 📈 E Sobre Limites de Consumo (Ex: Máximo de Imóveis)?

Ao invés de `Feature`, utilizamos `LimitType` que retorna a quantidade liberada.

1. Registre em `permissions.ts` o enum (Ex: `LimitType.PROPERTY_LIMIT = 'property_limit'`).
2. Utilize o hook para obter o limite real registrado no BD:
   ```tsx
   const { getLimit } = useFeature();
   const maxProperties = getLimit(LimitType.PROPERTY_LIMIT); // ex: retorna 50. (-1 == Infinito)
   ```
3. Mostre ao seu usuário a contagem real comparada ao limite utilizando o componente `<PlanLimit>`:
   ```tsx
   <PlanLimit 
      limitType={LimitType.PROPERTY_LIMIT} 
      currentValue={20} // Traga de uma query count() real do banco de dados
      label="Uso de Imóveis"
   />
   ```

A arquitetura garante centralização de vendas e escalabilidade sem refatoração recorrente, pronta para suportar addons e microtransações individuais. Desenvolva com responsabilidade.🚀
