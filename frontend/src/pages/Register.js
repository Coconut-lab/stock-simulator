import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatErrorMessage, validateEmail, validatePassword } from '../utils/helpers';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const FormCard = styled.div`
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
  font-weight: 700;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  color: #555;
  font-size: 14px;
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &.error {
    border-color: #e74c3c;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  background: #ffeaea;
  color: #e74c3c;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 4px solid #e74c3c;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  background: #f0f9f0;
  color: #27ae60;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 4px solid #27ae60;
  font-size: 14px;
`;

const LinkText = styled.p`
  text-align: center;
  margin-top: 20px;
  color: #666;
  
  a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 에러 메시지 초기화
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setErrorMessage('');
    setSuccessMessage('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) {
      newErrors.username = '사용자명을 입력해주세요.';
    } else if (formData.username.length < 2) {
      newErrors.username = '사용자명은 최소 2자 이상이어야 합니다.';
    }

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      setSuccessMessage('회원가입이 완료되었습니다!');
      
      // 2초 후 대시보드로 이동
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      setErrorMessage(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <FormCard>
        <Title>회원가입</Title>
        
        {errorMessage && (
          <ErrorMessage>{errorMessage}</ErrorMessage>
        )}
        
        {successMessage && (
          <SuccessMessage>{successMessage}</SuccessMessage>
        )}

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="username">사용자명</Label>
            <Input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={errors.username ? 'error' : ''}
              placeholder="사용자명을 입력하세요"
            />
            {errors.username && (
              <ErrorMessage>{errors.username}</ErrorMessage>
            )}
          </InputGroup>

          <InputGroup>
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="이메일을 입력하세요"
            />
            {errors.email && (
              <ErrorMessage>{errors.email}</ErrorMessage>
            )}
          </InputGroup>

          <InputGroup>
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              placeholder="비밀번호를 입력하세요 (최소 6자)"
            />
            {errors.password && (
              <ErrorMessage>{errors.password}</ErrorMessage>
            )}
          </InputGroup>

          <InputGroup>
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'error' : ''}
              placeholder="비밀번호를 다시 입력하세요"
            />
            {errors.confirmPassword && (
              <ErrorMessage>{errors.confirmPassword}</ErrorMessage>
            )}
          </InputGroup>

          <Button type="submit" disabled={loading}>
            {loading ? '회원가입 중...' : '회원가입'}
          </Button>
        </Form>

        <LinkText>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </LinkText>
      </FormCard>
    </Container>
  );
};

export default Register;
