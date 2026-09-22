import { API_BASE_URL, headers } from './config'

export interface LicenseInfo {
    valid: boolean;
    message: string;
    data?: {
      machine_code: string;
      activated_at: string;
      license_info: any;
    };
}

export interface ActivateRequest {
    activation_code: string;
    machine_code: string;
}

export const activateLicense = async (params: ActivateRequest): Promise<LicenseInfo> => {
  try {
    console.log('发送激活请求:', params);
    const response = await fetch(`${API_BASE_URL}/api/license/activate`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    console.log('激活响应状态:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('激活失败响应:', errorData);
      throw new Error(errorData?.detail || `激活失败: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('激活响应数据:', result);
    return result as LicenseInfo;
  } catch (error) {
    console.error('激活请求失败:', error);
    throw new Error(error instanceof Error ? error.message : '激活失败');
  }
};

export const getMachineCode = async (): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/license/machine-code`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || '获取机器码失败');
      }
      
      const data = await response.json();
      console.log('获取机器码响应:', data);
      
      if (!data.machine_code) {
        throw new Error('获取机器码失败：响应数据格式错误');
      }
      
      return data.machine_code;
    } catch (error) {
      console.error('获取机器码失败:', error);
      throw error;
    }
};

export const verifyLicense = async (): Promise<LicenseInfo> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/license/verify`, {
      method: 'GET',
      headers: {
        ...headers,
        'Accept': 'application/json'
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `验证失败: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('验证响应数据:', result);
    return result as LicenseInfo;
  } catch (error) {
    console.error('验证请求失败:', error);
    throw new Error(error instanceof Error ? error.message : '验证失败');
  }
};