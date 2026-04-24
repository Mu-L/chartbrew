import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { API_HOST } from "../config/settings";
import { getAuthToken } from "../modules/auth";

const initialState = {
  loading: false,
  error: null,
  data: [],
  active: null,
  createResult: null,
};

export const listChartTemplates = createAsyncThunk(
  "chartTemplate/list",
  async ({ team_id, source }) => {
    const token = getAuthToken();
    const url = `${API_HOST}/team/${team_id}/chart-templates?source=${source}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return response.json();
  }
);

export const getChartTemplate = createAsyncThunk(
  "chartTemplate/get",
  async ({ team_id, source, slug }) => {
    const token = getAuthToken();
    const url = `${API_HOST}/team/${team_id}/chart-templates/${source}/${slug}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return response.json();
  }
);

export const createFromChartTemplate = createAsyncThunk(
  "chartTemplate/create",
  async ({
    team_id, source, slug, data,
  }) => {
    const token = getAuthToken();
    const url = `${API_HOST}/team/${team_id}/chart-templates/${source}/${slug}/create`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || response.statusText);
    }

    return response.json();
  }
);

export const chartTemplateSlice = createSlice({
  name: "chartTemplate",
  initialState,
  reducers: {
    clearChartTemplateResult: (state) => {
      state.createResult = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(listChartTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(listChartTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(listChartTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getChartTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getChartTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.active = action.payload;
      })
      .addCase(getChartTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createFromChartTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.createResult = null;
      })
      .addCase(createFromChartTemplate.fulfilled, (state, action) => {
        state.loading = false;
        state.createResult = action.payload;
      })
      .addCase(createFromChartTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { clearChartTemplateResult } = chartTemplateSlice.actions;
export const selectChartTemplates = (state) => state.chartTemplate.data;
export const selectActiveChartTemplate = (state) => state.chartTemplate.active;
export const selectChartTemplateResult = (state) => state.chartTemplate.createResult;

export default chartTemplateSlice.reducer;

