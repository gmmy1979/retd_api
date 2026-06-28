export async function queryRetirement(idCard, cadre) {
  const params = new URLSearchParams({ idCard: idCard.toUpperCase() });
  if (cadre) {
    params.set('cadre', '1');
  }

  const res = await fetch(`/retirement?${params}`);
  const json = await res.json();

  if (!json.ok) {
    throw { code: json.error.code, message: json.error.message };
  }
  return json.data;
}

export async function calculateRetirement(birthDate, gender, cadre) {
  const params = new URLSearchParams({ birthDate, gender });
  if (cadre !== undefined && cadre !== null) {
    params.set('cadre', cadre ? '1' : '0');
  }

  const res = await fetch(`/retirement/calculate?${params}`);
  const json = await res.json();

  if (!json.ok) {
    throw { code: json.error.code, message: json.error.message };
  }
  return json.data;
}
