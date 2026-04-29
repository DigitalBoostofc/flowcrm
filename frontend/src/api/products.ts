import { api } from './client';
import type { PaginatedResponse, PaginationParams } from './pagination';
import { buildPaginationQuery } from './pagination';

export type ProductType = 'produto' | 'servico';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  price: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  type?: ProductType;
  price?: number | null;
  active?: boolean;
}

export interface ListProductsParams extends PaginationParams {
  onlyActive?: boolean;
}

export const listProducts = (
  params: ListProductsParams = {},
): Promise<PaginatedResponse<Product>> =>
  api
    .get('/products', {
      params: {
        ...(params.onlyActive ? { onlyActive: 'true' } : {}),
        ...buildPaginationQuery(params),
      },
    })
    .then((r) => r.data);

export const createProduct = (input: ProductInput): Promise<Product> =>
  api.post('/products', input).then((r) => r.data);

export const updateProduct = (id: string, input: Partial<ProductInput>): Promise<Product> =>
  api.patch(`/products/${id}`, input).then((r) => r.data);

export const deleteProduct = (id: string): Promise<void> =>
  api.delete(`/products/${id}`).then((r) => r.data);
