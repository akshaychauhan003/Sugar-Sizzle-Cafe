'use client';
import { useState } from 'react';
import { api, errMsg } from '@/lib/api';
import { useToast } from '@/components/shared/AuthProvider';
import { Modal } from '@/components/shared/ui';

const blank = {
  name: '',
  sku: '',
  category: '',
  description: '',
  price: '',
  cost: '',
  prepTimeMin: '10',
  imageUrl: '',
  recipe: '',
  stockStatus: 'in_stock',
  inventoryQuantity: '',
};

export default function MenuItemModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(
    item
      ? {
          ...blank,
          ...item,
          price: String(item.price),
          cost: item.cost != null ? String(item.cost) : '',
          prepTimeMin: String(item.prepTimeMin ?? 10),
          stockStatus: item.stockStatus || 'in_stock',
          inventoryQuantity:
            item.inventoryQuantity != null ? String(item.inventoryQuantity) : '',
        }
      : blank,
  );
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      setErrors((prev) => ({ ...prev, imageUrl: 'File size must be under 500KB' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setF((prev) => ({ ...prev, imageUrl: reader.result }));
      setErrors((prev) => ({ ...prev, imageUrl: '' }));
    };
    reader.readAsDataURL(file);
  }

  function validate() {
    const e = {};
    if (!f.name.trim()) e.name = 'Name is required';
    if (!f.category.trim()) e.category = 'Category is required';
    const p = Number(f.price);
    if (f.price === '' || !(p >= 0) || Math.round(p * 100) / 100 !== p) {
      e.price = 'Enter a price ≥ 0 with up to 2 decimals';
    }
    if (
      f.cost !== '' &&
      (!(Number(f.cost) >= 0) || Math.round(Number(f.cost) * 100) / 100 !== Number(f.cost))
    ) {
      e.cost = 'Cost must have up to 2 decimals';
    }
    const t = Number(f.prepTimeMin);
    if (!Number.isInteger(t) || t < 0 || t > 240) {
      e.prepTimeMin = 'Whole minutes, 0–240';
    }
    if (
      f.imageUrl &&
      !/^https?:\/\//i.test(f.imageUrl) &&
      !/^\//.test(f.imageUrl) &&
      !/^data:image\//i.test(f.imageUrl)
    ) {
      e.imageUrl = 'Must be an http(s) URL, path, or image data URL';
    }
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    const body = {
      name: f.name.trim(),
      category: f.category.trim(),
      description: f.description.trim(),
      price: Number(f.price),
      prepTimeMin: Number(f.prepTimeMin),
      imageUrl: f.imageUrl.trim(),
      recipe: f.recipe.trim(),
      stockStatus: f.stockStatus,
      isAvailable: f.stockStatus !== 'out_of_stock',
      ...(f.inventoryQuantity !== '' ? { inventoryQuantity: Number(f.inventoryQuantity) } : {}),
      ...(f.sku.trim() ? { sku: f.sku.trim() } : {}),
      ...(f.cost !== '' ? { cost: Number(f.cost) } : {}),
    };

    setBusy(true);
    try {
      if (item) {
        await api(`/menu/${item.id}`, { method: 'PUT', body });
      } else {
        await api('/menu', { method: 'POST', body });
      }
      toast(item ? 'Item updated' : 'Item created');
      onSaved();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  }

  const field = (k, label, props = {}) => (
    <label>
      {label}
      <input value={f[k]} onChange={set(k)} {...props} />
      {errors[k] && <span className="ferr">{errors[k]}</span>}
    </label>
  );

  return (
    <Modal title={item ? 'Edit menu item' : 'Add menu item'} onClose={onClose} wide>
      <form className="stack" onSubmit={submit} noValidate>
        {field('name', 'Name', { maxLength: 120 })}
        <div className="row">
          {field('category', 'Category', { maxLength: 60 })}
          {field('sku', 'SKU', { maxLength: 30 })}
        </div>
        <label>
          Description
          <textarea
            rows={2}
            maxLength={500}
            value={f.description}
            onChange={set('description')}
          />
        </label>
        <div className="row wrap">
          {field('price', 'Price', { type: 'number', step: '0.01', min: '0' })}
          {field('cost', 'Cost (admin)', { type: 'number', step: '0.01', min: '0' })}
          {field('prepTimeMin', 'Prep (min)', { type: 'number', min: '0', max: '240' })}
        </div>
        <div className="row wrap">
          <label>
            Stock Status
            <select value={f.stockStatus} onChange={set('stockStatus')}>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </label>
          {field('inventoryQuantity', 'Qty (optional)', { type: 'number', min: '0', step: '1' })}
        </div>
        <div className="row wrap">
          {field('imageUrl', 'Image URL or Data URI')}
          <label>
            Upload File (&lt;500KB)
            <input type="file" accept="image/*" onChange={handleImageFile} />
          </label>
        </div>
        <label>
          Recipe / prep notes
          <textarea
            rows={2}
            maxLength={2000}
            value={f.recipe}
            onChange={set('recipe')}
          />
        </label>
        <div className="row end">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
